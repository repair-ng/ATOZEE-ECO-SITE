export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { deleteSchema, updateItemSchema } from "@/lib/inv-schemas";
import { blankToNull, round2, serializeItem } from "@/lib/inv-serialize";

// Edits item details only. Quantity is deliberately NOT editable here — it
// only changes through stock-in / stock-out, so every change has a reason in the log.
export const PATCH = inv({}, async ({ req, params }) => {
  const b = await readJson(req, updateItemSchema);
  const data: Prisma.InvItemUpdateManyMutationInput = {
    ...(b.partNumber !== undefined ? { partNumber: b.partNumber } : {}),
    ...(b.nameEn !== undefined ? { nameEn: b.nameEn } : {}),
    ...(b.nameZh !== undefined ? { nameZh: blankToNull(b.nameZh) } : {}),
    ...(b.category !== undefined ? { category: b.category } : {}),
    ...(b.description !== undefined ? { description: blankToNull(b.description) } : {}),
    ...(b.unit !== undefined ? { unit: b.unit } : {}),
    ...(b.lowStockAt !== undefined ? { lowStockAt: b.lowStockAt } : {}),
    ...(b.priceNgn !== undefined ? { priceNgn: round2(b.priceNgn) } : {}),
    ...(b.invoiceable !== undefined ? { invoiceable: b.invoiceable } : {}),
  };
  try {
    const r = await prisma.invItem.updateMany({ where: { id: params.id, isDeleted: false }, data });
    if (r.count === 0) throw new HttpError(404, "Item not found", "NOT_FOUND");
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
    }
    throw e;
  }
  const item = await prisma.invItem.findUniqueOrThrow({ where: { id: params.id } });
  return NextResponse.json({ item: serializeItem(item) });
});

// "Delete" = soft delete + a REMOVED log entry for whatever stock was left.
export const DELETE = inv({}, async ({ req, user, params }) => {
  const { reason } = await readJson(req, deleteSchema);
  await prisma.$transaction(async (tx) => {
    const item = await tx.invItem.findFirst({ where: { id: params.id, isDeleted: false } });
    if (!item) throw new HttpError(404, "Item not found", "NOT_FOUND");
    await tx.invItem.update({ where: { id: item.id }, data: { isDeleted: true, quantity: 0 } });
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
