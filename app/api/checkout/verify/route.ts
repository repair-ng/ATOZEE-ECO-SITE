export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }
  if (!PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 500 });
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
  );
  const data = await res.json();

  if (!res.ok || !data?.status) {
    return NextResponse.json({ error: "Could not verify payment." }, { status: 502 });
  }

  const paid = data.data?.status === "success";

  const order = await prisma.order.update({
    where: { id: reference },
    data: {
      status: paid ? "paid" : "failed",
      paidAt: paid ? new Date() : null,
    },
  });

  return NextResponse.json({ order, paid });
}
