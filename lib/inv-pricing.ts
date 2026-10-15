// Pure pricing / availability rules (no imports — used by server and client).
type Num = number | { toNumber(): number } | null | undefined;
const n = (v: Num) => (v == null ? 0 : typeof v === "number" ? v : v.toNumber());

export interface PricingSettings {
  rate: number; // ₦ per ¥1
  marginPct: number; // default margin, %
}
export type PriceResult = { price: number; source: "computed" | "manual" | "none"; noRate: boolean };

/**
 * Store price = cost (¥) x rate x (1 + margin/100), rounded to the whole naira.
 * The item's own margin overrides the default. Items with no cost fall back to
 * their manual ₦ price. A cost with no rate configured yet can't be priced
 * (unless a manual price exists), and is flagged so the admin knows why.
 */
export function resolvePrice(
  item: { costCny: Num; marginPct: Num; priceNgn: Num },
  s: PricingSettings
): PriceResult {
  const cost = n(item.costCny);
  const manual = n(item.priceNgn);
  if (cost > 0) {
    if (s.rate > 0) {
      const margin = item.marginPct == null ? s.marginPct : n(item.marginPct);
      return { price: Math.round(cost * s.rate * (1 + margin / 100)), source: "computed", noRate: false };
    }
    return manual > 0 ? { price: manual, source: "manual", noRate: true } : { price: 0, source: "none", noRate: true };
  }
  return manual > 0 ? { price: manual, source: "manual", noRate: false } : { price: 0, source: "none", noRate: false };
}

export interface LinkInfo { required: number; linkedQty: number }

/** How many units of the linked item's stock can support (floor(linked / required)). */
export const linkSupports = (link: LinkInfo) => Math.max(0, Math.floor(link.linkedQty / Math.max(1, link.required)));

/** Units that can actually be sold: own stock, capped by what the linked item supports. */
export const sellableQty = (own: number, link: LinkInfo | null) =>
  link ? Math.max(0, Math.min(own, linkSupports(link))) : Math.max(0, own);
