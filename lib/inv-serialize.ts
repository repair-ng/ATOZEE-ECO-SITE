import type { InvItem, InvUser } from "@prisma/client";
import type { ItemVM, UserVM } from "@/lib/inv-types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function serializeItem(i: InvItem): ItemVM {
  return {
    id: i.id,
    partNumber: i.partNumber,
    nameEn: i.nameEn,
    nameZh: i.nameZh,
    category: i.category,
    description: i.description,
    unit: i.unit,
    quantity: i.quantity,
    lowStockAt: i.lowStockAt,
    priceNgn: Number(i.priceNgn),
    invoiceable: i.invoiceable,
  };
}

export function serializeUser(u: InvUser): UserVM {
  // passwordHash is deliberately never included.
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive,
    language: u.language === "zh" ? "zh" : "en",
    createdAt: u.createdAt.toISOString(),
  };
}

export const blankToNull = (v: string | null | undefined) =>
  v === undefined ? undefined : v === null || v.trim() === "" ? null : v.trim();
