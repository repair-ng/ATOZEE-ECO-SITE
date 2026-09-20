export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password, firstName, lastName, phone, city, state, address } = body;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Email, password, first name and last name are required." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Deliberately vague, consistent with the "no account enumeration"
    // stance used on password reset.
    return NextResponse.json(
      { error: "Could not create account with those details." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      firstName,
      lastName,
      phone: phone || null,
      city: city || null,
      state: state || null,
      address: address || null,
    },
  });

  await createSession(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, firstName: user.firstName },
  });
}
