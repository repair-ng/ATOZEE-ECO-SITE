import type { Prisma, PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/inv-guard";

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * Links are one level deep: an item can link to a "base" item, but a base item
 * can't itself be linked, and an item that others link to can't become linked.
 * That keeps "is there enough stock?" a single, unambiguous comparison.
 */
export async function checkLink(db: Db, selfId: string | null, targetId: string) {
  if (selfId && targetId === selfId) throw new HttpError(400, "An item can't link to itself", "LINK_SELF");
  const target = await db.invItem.findFirst({
    where: { id: targetId, isDeleted: false }, select: { id: true, linkedItemId: true },
  });
  if (!target) throw new HttpError(404, "Linked item not found", "LINK_TARGET_MISSING");
  if (target.linkedItemId) throw new HttpError(400, "The linked item is itself linked to another item", "LINK_CHAIN");
  if (selfId) {
    const inbound = await db.invItem.count({ where: { linkedItemId: selfId, isDeleted: false } });
    if (inbound > 0) throw new HttpError(400, "Other items are linked to this one", "LINKED_BY");
  }
}
