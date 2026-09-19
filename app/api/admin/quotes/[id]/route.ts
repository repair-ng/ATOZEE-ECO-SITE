import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const quote = await prisma.quoteRequest.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ quote });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const {
    status,
    fobPrice,
    shippingCost,
    shippingCbm,
    freightClearingCost,
    localDeliveryCost,
    quotedTotal,
  } = body;

  const quote = await prisma.quoteRequest.update({
    where: { id: params.id },
    data: {
      ...(status ? { status } : {}),
      ...(fobPrice !== undefined ? { fobPrice } : {}),
      ...(shippingCost !== undefined ? { shippingCost } : {}),
      ...(shippingCbm !== undefined ? { shippingCbm } : {}),
      ...(freightClearingCost !== undefined ? { freightClearingCost } : {}),
      ...(localDeliveryCost !== undefined ? { localDeliveryCost } : {}),
      ...(quotedTotal !== undefined ? { quotedTotal } : {}),
      ...(quotedTotal !== undefined ? { quoteSentAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ quote });
}
