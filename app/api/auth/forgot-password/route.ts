export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateRawResetToken,
  hashResetToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

// Always returns the same generic message, regardless of whether the email
// matches an account, so this endpoint can't be used to enumerate users.
const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a reset link.",
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = body?.email ? String(body.email).trim().toLowerCase() : null;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const rawToken = generateRawResetToken();
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error("Failed to send password reset email", err);
    });
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
