import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/inv-guard";
import { checkLink } from "@/lib/inv-link";

export interface ItemData {
  partNumber: string; nameEn: string; nameZh: string | null; category: string; description: string | null;
  unit: string; lowStockAt: number; priceNgn: number; costCny: number | null; marginPct: number | null;
  invoiceable: boolean; engineNumbers: string[]; linkedItemId: string | null; linkQty: number | null;
}

/** Creates an item (or restores a previously deleted one with the same part number) and logs the ADDED movement. */
export async function createOrRestore(
  tx: Prisma.TransactionClient,
  user: { id: string; username: string },
  d: ItemData,
  quantity: number,
  reason: string
) {
  const { partNumber, ...rest } = d;
  const existing = await tx.invItem.findUnique({ where: { partNumber } });
  if (existing && !existing.isDeleted) throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
  if (d.linkedItemId) await checkLink(tx, existing?.id ?? null, d.linkedItemId);

  const item = existing
    ? await tx.invItem.update({ where: { id: existing.id }, data: { ...rest, quantity, isDeleted: false } })
    : await tx.invItem.create({ data: { ...rest, partNumber, quantity } });

  await tx.invMovement.create({
    data: {
      itemId: item.id, partNumber: item.partNumber, itemName: item.nameEn, type: "ADDED",
      quantity, balanceAfter: quantity, reason, userId: user.id, username: user.username,
    },
  });
  return item;
}
