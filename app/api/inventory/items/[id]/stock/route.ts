export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inv, readJson } from "@/lib/inv-guard";
import { stockSchema } from "@/lib/inv-schemas";
import { ITEM_INCLUDE, serializeItem } from "@/lib/inv-serialize";
import { getPricingSettings } from "@/lib/inv-settings";
import { applyStock } from "@/lib/inv-stock";
import { canSeePricing } from "@/lib/inv-types";

export const POST = inv({}, async ({ req, user, params }) => {
  const b = await readJson(req, stockSchema);
  await prisma.$transaction((tx) =>
    applyStock(tx, { itemId: params.id, type: b.type, quantity: b.quantity, reason: b.reason, user })
  );
  const [item, pricing] = await Promise.all([
    prisma.invItem.findUniqueOrThrow({ where: { id: params.id }, include: ITEM_INCLUDE }),
    getPricingSettings(),
  ]);
  return NextResponse.json({ item: serializeItem(item, pricing, canSeePricing(user.role)) });
});
