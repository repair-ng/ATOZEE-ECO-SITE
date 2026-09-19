import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDeliveryFeeForState } from "@/lib/delivery";
import { sendQuoteConfirmationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to submit a quote request." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { items, notes, deliveryMethod, deliveryAddress, deliveryState } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }
  if (deliveryMethod !== "delivery" && deliveryMethod !== "pickup") {
    return NextResponse.json({ error: "Invalid delivery method." }, { status: 400 });
  }

  let deliveryFee: number | null = null;
  const finalAddress = deliveryAddress || user.address || null;

  if (deliveryMethod === "delivery") {
    const state = deliveryState || user.state;
    if (!state) {
      return NextResponse.json(
        { error: "A state is required to calculate delivery." },
        { status: 400 }
      );
    }
    deliveryFee = await getDeliveryFeeForState(state);
    if (deliveryFee === null) {
      return NextResponse.json(
        { error: "Delivery isn't yet available for that state. Please choose pickup or contact us." },
        { status: 400 }
      );
    }
  }

  const quote = await prisma.quoteRequest.create({
    data: {
      userId: user.id,
      items,
      notes: notes || null,
      deliveryMethod,
      deliveryFee: deliveryMethod === "delivery" ? deliveryFee : null,
      deliveryAddress: deliveryMethod === "delivery" ? finalAddress : null,
    },
  });

  await sendQuoteConfirmationEmail(user.email, quote.id).catch((err) =>
    console.error("Failed to send quote confirmation email", err)
  );

  return NextResponse.json({ quoteId: quote.id });
}
