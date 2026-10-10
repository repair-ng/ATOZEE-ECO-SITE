import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import type { InvRole } from "@prisma/client";
import { getSessionUser, type InvSessionUser } from "@/lib/inv-auth";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function jsonError(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/** CSRF defence in depth (cookie is already SameSite=Lax): mutations must come from our own origin. */
export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) throw new HttpError(403, "Missing origin", "FORBIDDEN_ORIGIN");
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Bad origin", "FORBIDDEN_ORIGIN");
  }
  const expected = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const extra = (process.env.INVENTORY_ALLOWED_ORIGINS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (host !== expected && !extra.includes(origin)) {
    throw new HttpError(403, "Cross-origin request blocked", "FORBIDDEN_ORIGIN");
  }
}

/** Cheap DoS guard: refuse oversized bodies before parsing. */
export function assertSize(req: NextRequest, maxBytes = 200_000) {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) {
    throw new HttpError(413, "Request too large", "TOO_LARGE");
  }
}

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body", "VALIDATION");
  }
  return schema.parse(raw);
}

export function pageParams(sp: URLSearchParams) {
  const page = Math.min(Math.max(parseInt(sp.get("page") ?? "1", 10) || 1, 1), 100000);
  const pageSize = Math.min(Math.max(parseInt(sp.get("pageSize") ?? "25", 10) || 25, 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function handleError(e: unknown) {
  if (e instanceof HttpError) return jsonError(e.status, e.message, e.code);
  if (e instanceof ZodError) {
    const i = e.issues[0];
    const where = i?.path?.length ? `${i.path.join(".")}: ` : "";
    return jsonError(400, `${where}${i?.message ?? "Invalid input"}`, "VALIDATION");
  }
  console.error("[inventory api]", e);
  return jsonError(500, "Something went wrong", "SERVER");
}

interface Ctx {
  req: NextRequest;
  user: InvSessionUser;
  params: Record<string, string>;
}

/** Wraps a route handler with auth, role check, CSRF/size guards and uniform error output. */
export function inv(opts: { roles?: InvRole[] }, fn: (ctx: Ctx) => Promise<Response>) {
  return async (req: NextRequest, routeCtx: { params: Record<string, string> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        assertSameOrigin(req);
        assertSize(req);
      }
      const user = await getSessionUser();
      if (!user) throw new HttpError(401, "Not signed in", "UNAUTHORIZED");
      if (opts.roles && !opts.roles.includes(user.role)) {
        throw new HttpError(403, "Not allowed for your role", "FORBIDDEN");
      }
      return await fn({ req, user, params: routeCtx?.params ?? {} });
    } catch (e) {
      return handleError(e);
    }
  };
}
