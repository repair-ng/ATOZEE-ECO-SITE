import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "./db";

const SESSION_COOKIE = "atozee_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("AUTH_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

// ---- Passwords -------------------------------------------------------

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

// ---- Sessions (JWT in httpOnly cookie) --------------------------------

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function destroySession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

// ---- Password reset tokens ---------------------------------------------
// Raw token goes in the emailed link; only its hash is stored, so a DB
// leak alone can't be used to reset accounts.

export function generateRawResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
