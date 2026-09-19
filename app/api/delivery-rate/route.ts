import { NextRequest, NextResponse } from "next/server";
import { getDeliveryFeeForState } from "@/lib/delivery";

// Public, read-only lookup so the checkout/quote UI can show a live fee as
// the customer picks a state — distinct from /api/admin/delivery, which is
// staff-only and handles editing the rate table.
export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  if (!state) {
    return NextResponse.json({ error: "state is required" }, { status: 400 });
  }
  const fee = await getDeliveryFeeForState(state);
  if (fee === null) {
    return NextResponse.json(
      { available: false, message: "Delivery isn't yet available for that state." },
      { status: 200 }
    );
  }
  return NextResponse.json({ available: true, fee });
}
