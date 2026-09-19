import { prisma } from "./db";

/** Looks up the configured delivery fee for a Nigerian state. Returns null
 *  if no rate has been configured yet for that state — callers should
 *  treat that as "delivery not available, offer pickup only" or fall back
 *  to a sensible default, depending on how strict you want checkout to be.
 */
export async function getDeliveryFeeForState(state: string): Promise<number | null> {
  const rate = await prisma.deliveryRate.findUnique({
    where: { state: normalizeState(state) },
  });
  return rate ? Number(rate.price) : null;
}

export function normalizeState(state: string) {
  return state.trim();
}

export const QUOTE_THRESHOLD_NGN = Number(
  process.env.NEXT_PUBLIC_QUOTE_THRESHOLD_NGN || 400000
);

interface CheckoutDecisionInput {
  itemsInStock: boolean;
  subtotal: number;
  deliveryFee: number; // 0 if pickup
}

/** Same v1 stock/threshold logic, now accounting for delivery fee in the
 *  total that gets compared against the quote threshold. */
export function decideCheckoutPath({
  itemsInStock,
  subtotal,
  deliveryFee,
}: CheckoutDecisionInput): "instant_checkout" | "quote_request" {
  const total = subtotal + deliveryFee;
  if (itemsInStock && total <= QUOTE_THRESHOLD_NGN) {
    return "instant_checkout";
  }
  return "quote_request";
}
