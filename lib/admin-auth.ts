import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "crypto";

const ADMIN_COOKIE = "atozee_admin_session";

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  return createHash("sha256").update(`${value}:${secret}`).digest("hex");
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminSession() {
  const token = sign("admin");
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
}

export function destroyAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

export function isAdminAuthenticated() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return token === sign("admin");
}
