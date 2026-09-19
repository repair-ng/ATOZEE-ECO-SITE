import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getDeliveryFeeForState, decideCheckoutPath } from "@/lib/delivery";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to check out." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const { items, deliveryMethod, deliveryAddress, deliveryState } = body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }
  if (deliveryMethod !== "delivery" && deliveryMethod !== "pickup") {
    return NextResponse.json({ error: "Invalid delivery method." }, { status: 400 });
  }

  const productIds = items.map((i: { productId: string }) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

  const subtotal = items.reduce((sum: number, i: { productId: string; quantity: number }) => {
    const product = products.find((p) => p.id === i.productId);
    return sum + (product ? Number(product.price) * i.quantity : 0);
  }, 0);
  const itemsInStock = products.every((p) => p.inStock) && products.length === productIds.length;

  let deliveryFee = 0;
  const finalAddress = deliveryAddress || user.address || null;

  if (deliveryMethod === "delivery") {
    const state = deliveryState || user.state;
    if (!state) {
      return NextResponse.json(
        { error: "A state is required to calculate delivery." },
        { status: 400 }
      );
    }
    const fee = await getDeliveryFeeForState(state);
    if (fee === null) {
      return NextResponse.json(
        { error: "Delivery isn't yet available for that state. Please choose pickup or contact us." },
        { status: 400 }
      );
    }
    deliveryFee = fee;
  }

  const path = decideCheckoutPath({ itemsInStock, subtotal, deliveryFee });

  if (path === "quote_request") {
    return NextResponse.json({
      path: "quote_request",
      message:
        "This order needs a manual quote (item out of stock or total above the instant-checkout threshold). Please submit a quote request instead.",
    });
  }

  // Instant checkout path — create a pending order, then init Paystack.
  const amount = subtotal + deliveryFee;

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      items,
      customerName: `${user.firstName} ${user.lastName}`,
      customerEmail: user.email,
      customerPhone: user.phone || "",
      amount,
      deliveryMethod,
      deliveryFee,
      deliveryAddress: deliveryMethod === "delivery" ? finalAddress : null,
    },
  });

  if (!PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments are not yet configured on this deployment." },
      { status: 500 }
    );
  }

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(amount * 100), // kobo
      reference: order.id,
      metadata: { orderId: order.id },
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin}/checkout/success`,
    }),
  });

  const paystackData = await paystackRes.json();

  if (!paystackRes.ok || !paystackData?.status) {
    return NextResponse.json(
      { error: "Could not initialize payment. Please try again." },
      { status: 502 }
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paystackReference: order.id },
  });

  return NextResponse.json({
    path: "instant_checkout",
    authorizationUrl: paystackData.data.authorization_url,
    orderId: order.id,
  });
}
