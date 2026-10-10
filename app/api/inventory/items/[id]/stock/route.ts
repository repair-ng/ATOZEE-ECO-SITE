export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inv, readJson } from "@/lib/inv-guard";
import { stockSchema } from "@/lib/inv-schemas";
import { serializeItem } from "@/lib/inv-serialize";
import { applyStock } from "@/lib/inv-stock";

export const POST = inv({}, async ({ req, user, params }) => {
  const b = await readJson(req, stockSchema);
  const item = await prisma.$transaction((tx) =>
    applyStock(tx, { itemId: params.id, type: b.type, quantity: b.quantity, reason: b.reason, user })
  );
  return NextResponse.json({ item: serializeItem(item) });
});
