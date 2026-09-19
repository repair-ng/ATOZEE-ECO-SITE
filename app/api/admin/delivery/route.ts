import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rates = await prisma.deliveryRate.findMany({ orderBy: { state: "asc" } });
  return NextResponse.json({ rates });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { state, price } = await req.json().catch(() => ({}));
  if (!state || price === undefined || price === null) {
    return NextResponse.json({ error: "State and price are required." }, { status: 400 });
  }

  const rate = await prisma.deliveryRate.upsert({
    where: { state },
    update: { price },
    create: { state, price },
  });

  return NextResponse.json({ rate });
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { state } = await req.json().catch(() => ({}));
  if (!state) {
    return NextResponse.json({ error: "State is required." }, { status: 400 });
  }
  await prisma.deliveryRate.delete({ where: { state } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
