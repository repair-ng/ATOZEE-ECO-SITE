import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(body.email).trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Same generic error whether the email doesn't exist or the password is
  // wrong, so login can't be used to enumerate accounts either.
  const genericError = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );

  if (!user) return genericError;

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return genericError;

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, firstName: user.firstName },
  });
}
