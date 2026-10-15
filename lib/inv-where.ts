import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export interface ItemFilter {
  q?: string;
  category?: string;
  low?: boolean;
  invoiceableOnly?: boolean;
  unpublishedOnly?: boolean; // never published, or changed since the last publish
}

/** One place that turns list filters into a Prisma where clause (used by the list and by bulk publish). */
export function itemWhere(f: ItemFilter): Prisma.InvItemWhereInput {
  const q = f.q?.trim().slice(0, 100);
  const and: Prisma.InvItemWhereInput[] = [];
  if (f.unpublishedOnly) {
    and.push({ OR: [{ publishedAt: null }, { updatedAt: { gt: prisma.invItem.fields.publishedAt } }] });
  }
  if (q) {
    and.push({
      OR: [
        { partNumber: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameZh: { contains: q } },
        { description: { contains: q, mode: "insensitive" } },
        { engineNumbers: { has: q } }, // exact engine number
      ],
    });
  }
  return {
    isDeleted: false,
    ...(f.category ? { category: f.category.slice(0, 80) } : {}),
    ...(f.invoiceableOnly ? { invoiceable: true } : {}),
    ...(f.low ? { quantity: { lte: prisma.invItem.fields.lowStockAt } } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}
