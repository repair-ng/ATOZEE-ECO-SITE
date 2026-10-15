export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { checkLink } from "@/lib/inv-link";
import { deleteSchema, updateItemSchema } from "@/lib/inv-schemas";
import { blankToNull, dedupe, ITEM_INCLUDE, round2, serializeItem } from "@/lib/inv-serialize";
import { getPricingSettings } from "@/lib/inv-settings";
import { canSeePricing } from "@/lib/inv-types";

// Edits item details only. Quantity is deliberately NOT editable here — it
// only changes through stock-in / stock-out, so every change has a reason in the log.
export const PATCH = inv({}, async ({ req, user, params }) => {
  const b = await readJson(req, updateItemSchema);
  const existing = await prisma.invItem.findFirst({ where: { id: params.id, isDeleted: false } });
  if (!existing) throw new HttpError(404, "Item not found", "NOT_FOUND");
  const pricingRole = canSeePricing(user.role);

  const data: Prisma.InvItemUncheckedUpdateManyInput = {
    ...(b.partNumber !== undefined ? { partNumber: b.partNumber } : {}),
    ...(b.nameEn !== undefined ? { nameEn: b.nameEn } : {}),
    ...(b.nameZh !== undefined ? { nameZh: blankToNull(b.nameZh) } : {}),
    ...(b.category !== undefined ? { category: b.category } : {}),
    ...(b.description !== undefined ? { description: blankToNull(b.description) } : {}),
    ...(b.unit !== undefined ? { unit: b.unit } : {}),
    ...(b.lowStockAt !== undefined ? { lowStockAt: b.lowStockAt } : {}),
    ...(b.invoiceable !== undefined ? { invoiceable: b.invoiceable } : {}),
    ...(b.engineNumbers !== undefined ? { engineNumbers: dedupe(b.engineNumbers) } : {}),
    ...(b.costCny !== undefined ? { costCny: b.costCny } : {}),
    ...(pricingRole && b.priceNgn !== undefined ? { priceNgn: round2(b.priceNgn) } : {}),
    ...(pricingRole && b.marginPct !== undefined ? { marginPct: b.marginPct } : {}),
  };

  if (b.linkedItemId !== undefined) {
    if (!b.linkedItemId) {
      data.linkedItemId = null;
      data.linkQty = null;
    } else {
      await checkLink(prisma, existing.id, b.linkedItemId);
      data.linkedItemId = b.linkedItemId;
      data.linkQty = b.linkQty ?? existing.linkQty ?? 1;
    }
  } else if (b.linkQty != null && existing.linkedItemId) {
    data.linkQty = b.linkQty;
  }

  try {
    await prisma.invItem.updateMany({ where: { id: existing.id, isDeleted: false }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
    }
    throw e;
  }
  const [item, pricing] = await Promise.all([
    prisma.invItem.findUniqueOrThrow({ where: { id: existing.id }, include: ITEM_INCLUDE }),
    getPricingSettings(),
  ]);
  return NextResponse.json({ item: serializeItem(item, pricing, pricingRole) });
});

// "Delete" = soft delete + a REMOVED log entry for whatever stock was left.
export const DELETE = inv({}, async ({ req, user, params }) => {
  const { reason } = await readJson(req, deleteSchema);
  await prisma.$transaction(async (tx) => {
    const item = await tx.invItem.findFirst({ where: { id: params.id, isDeleted: false } });
    if (!item) throw new HttpError(404, "Item not found", "NOT_FOUND");
    // Other items depend on this one for their stock — don't pull the rug out.
    const dependants = await tx.invItem.count({ where: { linkedItemId: item.id, isDeleted: false } });
    if (dependants > 0) throw new HttpError(409, "Other items are linked to this one", "LINKED_BY");
    await tx.invItem.update({
      where: { id: item.id }, data: { isDeleted: true, quantity: 0, linkedItemId: null, linkQty: null },
    });
    await tx.invMovement.create({
      data: {
        itemId: item.id, partNumber: item.partNumber, itemName: item.nameEn,
        type: "REMOVED", quantity: item.quantity, balanceAfter: 0,
        reason: `Item deleted — ${reason}`, userId: user.id, username: user.username,
      },
    });
  });
  return NextResponse.json({ ok: true });
});
