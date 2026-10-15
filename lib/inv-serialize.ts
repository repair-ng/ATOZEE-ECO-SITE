import type { InvUser, Prisma } from "@prisma/client";
import { resolvePrice, sellableQty, type PricingSettings } from "@/lib/inv-pricing";
import type { ItemVM, UserVM } from "@/lib/inv-types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const ITEM_INCLUDE = {
  linkedItem: { select: { id: true, partNumber: true, nameEn: true, quantity: true, isDeleted: true } },
} satisfies Prisma.InvItemInclude;
export type ItemWithLink = Prisma.InvItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

export function serializeItem(i: ItemWithLink, s: PricingSettings, showPricing: boolean): ItemVM {
  const link =
    i.linkedItem && i.linkQty
      ? {
          itemId: i.linkedItem.id, partNumber: i.linkedItem.partNumber, name: i.linkedItem.nameEn,
          required: i.linkQty, linkedQty: i.linkedItem.isDeleted ? 0 : i.linkedItem.quantity,
        }
      : null;
  const price = resolvePrice(i, s);
  return {
    id: i.id, partNumber: i.partNumber, nameEn: i.nameEn, nameZh: i.nameZh, category: i.category,
    description: i.description, unit: i.unit, quantity: i.quantity, lowStockAt: i.lowStockAt,
    invoiceable: i.invoiceable, engineNumbers: i.engineNumbers,
    costCny: i.costCny == null ? null : Number(i.costCny),
    // Margin and selling price are withheld from roles that must not see them.
    priceNgn: showPricing ? Number(i.priceNgn) : 0,
    marginPct: showPricing && i.marginPct != null ? Number(i.marginPct) : null,
    sellPriceNgn: showPricing ? price.price : null,
    priceSource: showPricing ? price.source : "none",
    link, sellable: sellableQty(i.quantity, link),
    updatedAt: i.updatedAt.toISOString(),
    publishedAt: i.publishedAt ? i.publishedAt.toISOString() : null,
  };
}

export function serializeUser(u: InvUser): UserVM {
  // passwordHash is deliberately never included.
  return {
    id: u.id, username: u.username, displayName: u.displayName, role: u.role, isActive: u.isActive,
    language: u.language === "zh" ? "zh" : "en", createdAt: u.createdAt.toISOString(),
  };
}

export const blankToNull = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null || v.trim() === "" ? null : v.trim();

export const dedupe = (xs: string[]) => {
  const seen = new Set<string>();
  return xs.map((x) => x.trim()).filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
};
