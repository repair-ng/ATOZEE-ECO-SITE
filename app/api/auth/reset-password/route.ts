export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashResetToken, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { token, password } = body || {};

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and new password are required." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const tokenHash = hashResetToken(token);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash },
  });

  const invalid = NextResponse.json(
    { error: "This reset link is invalid or has expired." },
    { status: 400 }
  );

  if (!record) return invalid;
  if (record.usedAt) return invalid; // no replay
  if (record.expiresAt < new Date()) return invalid;

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
