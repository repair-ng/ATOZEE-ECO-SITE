export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  INV_COOKIE, createSessionToken, getDummyHash, hashPassword,
  sessionCookieOptions, verifyPassword,
} from "@/lib/inv-auth";
import { assertSameOrigin, assertSize, handleError, HttpError, readJson } from "@/lib/inv-guard";
import { clearKey, isLimited, recordHit } from "@/lib/inv-ratelimit";
import { loginSchema } from "@/lib/inv-schemas";

const WINDOW = 15 * 60 * 1000;

// First-run convenience: if there are no staff accounts yet and bootstrap
// credentials are set in the environment, create the first global admin.
async function bootstrapAdminIfEmpty() {
  const u = process.env.INVENTORY_BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase();
  const p = process.env.INVENTORY_BOOTSTRAP_ADMIN_PASSWORD;
  if (!u || !p || p.length < 10) return;
  if ((await prisma.invUser.count()) > 0) return;
  await prisma.invUser.create({
    data: { username: u, displayName: "Global Admin", passwordHash: await hashPassword(p), role: "GLOBAL_ADMIN" },
  });
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    assertSize(req, 10_000);
    const { username, password } = await readJson(req, loginSchema);

    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
    const ipKey = `ip:${ip}`;
    const userKey = `u:${username}`;
    if (isLimited(ipKey, 40) || isLimited(userKey, 6)) {
      throw new HttpError(429, "Too many attempts. Try again later.", "RATE_LIMITED");
    }

    await bootstrapAdminIfEmpty();
    const user = await prisma.invUser.findUnique({ where: { username } });
    // Always run one scrypt, so response time doesn't reveal whether the username exists.
    const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
    if (!user || !user.isActive || !ok) {
      recordHit(ipKey, WINDOW);
      recordHit(userKey, WINDOW);
      throw new HttpError(401, "Invalid username or password", "INVALID_LOGIN");
    }

    clearKey(userKey);
    const res = NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
    res.cookies.set(INV_COOKIE, createSessionToken(user.id, user.sessionVersion), sessionCookieOptions);
    return res;
  } catch (e) {
    return handleError(e);
  }
}
