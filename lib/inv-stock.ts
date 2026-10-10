import type { Prisma } from "@prisma/client";
import { HttpError } from "@/lib/inv-guard";

/**
 * Single choke point for changing stock: updates the quantity atomically
 * (REMOVED can never take it below zero) and writes the log row in the same
 * transaction, so quantity and history can't drift apart.
 */
export async function applyStock(
  tx: Prisma.TransactionClient,
  p: {
    itemId: string;
    type: "ADDED" | "REMOVED";
    quantity: number;
    reason: string;
    user: { id: string; username: string };
  }
) {
  const removing = p.type === "REMOVED";
  const r = await tx.invItem.updateMany({
    where: removing
      ? { id: p.itemId, isDeleted: false, quantity: { gte: p.quantity } }
      : { id: p.itemId, isDeleted: false },
    data: { quantity: removing ? { decrement: p.quantity } : { increment: p.quantity } },
  });
  if (r.count === 0) {
    const exists = await tx.invItem.findFirst({ where: { id: p.itemId, isDeleted: false }, select: { id: true } });
    throw exists
      ? new HttpError(409, "Not enough stock", "INSUFFICIENT_STOCK")
      : new HttpError(404, "Item not found", "NOT_FOUND");
  }
  const item = await tx.invItem.findUniqueOrThrow({ where: { id: p.itemId } });
  await tx.invMovement.create({
    data: {
      itemId: item.id,
      partNumber: item.partNumber,
      itemName: item.nameEn,
      type: p.type,
      quantity: p.quantity,
      balanceAfter: item.quantity,
      reason: p.reason,
      userId: p.user.id,
      username: p.user.username,
    },
  });
  return item;
}
