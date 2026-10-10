import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Lang, Role } from "@/lib/inv-types";

// Separate from the store-admin session (atozee_admin_session) on purpose:
// different cookie, different secret, per-user accounts.
export const INV_COOKIE = "inv_session";
export const SESSION_SECONDS = 60 * 60 * 12; // 12h

export interface InvSessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  language: Lang;
}

function secret(): string {
  const s = process.env.INVENTORY_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "INVENTORY_SESSION_SECRET must be set to a random string of at least 32 characters (openssl rand -hex 32)."
    );
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// Used so "unknown user" costs the same time as "wrong password".
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword("not-a-real-password-" + crypto.randomBytes(8).toString("hex"));
  return dummyHash;
}

export function createSessionToken(userId: string, version: number): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${userId}.${version}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_SECONDS,
};

/**
 * Resolves the logged-in staff member, or null. The user row is re-read on
 * every request so disabling an account or changing a password/role takes
 * effect immediately (sessionVersion mismatch invalidates old cookies).
 */
export async function getSessionUser(): Promise<InvSessionUser | null> {
  const raw = cookies().get(INV_COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [uid, ver, exp, sig] = parts;
  if (!safeEqual(sig, sign(`${uid}.${ver}.${exp}`))) return null;
  if (!(Number(exp) > Date.now() / 1000)) return null;

  const user = await prisma.invUser.findUnique({ where: { id: uid } });
  if (!user || !user.isActive || user.sessionVersion !== Number(ver)) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    language: user.language === "zh" ? "zh" : "en",
  };
}
