import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { linkSupports, resolvePrice, sellableQty, type PricingSettings } from "@/lib/inv-pricing";
import type { ItemWithLink } from "@/lib/inv-serialize";

export type PublishAction = "create" | "update" | "unchanged" | "skipped" | "failed";
export type PublishReason = "NO_PRICE" | "NO_RATE" | "AMBIGUOUS" | "EXISTS" | "LINK_SHORT" | "ERROR";
export interface PublishRow {
  partNumber: string;
  name: string;
  action: PublishAction;
  reason?: PublishReason;
  priceNgn?: number;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "item";
const sameSet = (a: string[], b: string[]) => {
  const x = new Set(a.map((v) => v.toLowerCase()));
  return x.size === new Set(b.map((v) => v.toLowerCase())).size && b.every((v) => x.has(v.toLowerCase()));
};

interface Planned extends PublishRow {
  item: ItemWithLink;
  productId?: string;
  slug?: string;
  inStock?: boolean;
}

/**
 * Pushes inventory items straight into the store's `products` table (same Postgres),
 * matched to existing products by part number.
 *
 *  Price     = cost (¥) x exchange rate x (1 + margin%) when the item has a cost,
 *              otherwise its manual ₦ price. No price -> skipped (never publish a free product).
 *  In stock  = sellable quantity > 0, where sellable = min(own stock, what the linked item supports).
 *  Linked    = if the linked item can't cover the required quantity, a NEW product is not created
 *              (LINK_SHORT); a product already on the store is updated but marked out of stock.
 *  No match  -> create (active, no images; engine numbers copied across).
 *  Match     -> with "update existing": name, category, description, price, in-stock (and engine
 *              numbers, when the item has any) are overwritten. Images, URL slug and the hidden/
 *              active switch are never touched. Without it: skipped.
 *
 * With dryRun it only reports what would happen.
 */
export async function runPublish(
  items: ItemWithLink[],
  pricing: PricingSettings,
  opts: { updateExisting: boolean; dryRun: boolean }
) {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, partNumber: true, name: true, category: true, description: true, price: true, inStock: true, engineNumbers: true },
  });
  const byPart = new Map<string, typeof products>();
  for (const p of products) {
    const k = p.partNumber.trim().toLowerCase();
    byPart.set(k, [...(byPart.get(k) ?? []), p]);
  }
  const slugs = new Set(products.map((p) => p.slug));

  const plan: Planned[] = items.map((item) => {
    const price = resolvePrice(item, pricing);
    const base = { item, partNumber: item.partNumber, name: item.nameEn, priceNgn: price.price };
    if (price.price <= 0) return { ...base, action: "skipped", reason: price.noRate ? "NO_RATE" : "NO_PRICE" };

    const link = item.linkedItem && item.linkQty
      ? { required: item.linkQty, linkedQty: item.linkedItem.isDeleted ? 0 : item.linkedItem.quantity }
      : null;
    const linkShort = !!link && linkSupports(link) < 1;
    const inStock = sellableQty(item.quantity, link) > 0;

    const matches = byPart.get(item.partNumber.trim().toLowerCase()) ?? [];
    if (matches.length > 1) return { ...base, action: "skipped", reason: "AMBIGUOUS" };
    if (matches.length === 1) {
      const p = matches[0];
      if (!opts.updateExisting) return { ...base, action: "skipped", reason: "EXISTS", productId: p.id };
      const same =
        p.name === item.nameEn && p.category === item.category &&
        (p.description ?? "") === (item.description ?? "") &&
        Number(p.price) === price.price && p.inStock === inStock &&
        (item.engineNumbers.length === 0 || sameSet(p.engineNumbers, item.engineNumbers));
      return { ...base, action: same ? "unchanged" : "update", productId: p.id, slug: p.slug, inStock };
    }
    if (linkShort) return { ...base, action: "skipped", reason: "LINK_SHORT" };

    let slug = slugify(`${item.nameEn}-${item.partNumber}`);
    const root = slug;
    for (let n = 2; slugs.has(slug); n++) slug = `${root}-${n}`;
    slugs.add(slug);
    return { ...base, action: "create", slug, inStock };
  });

  if (!opts.dryRun) {
    for (const row of plan) {
      try {
        if (row.action === "create") {
          await prisma.product.create({
            data: {
              name: row.item.nameEn, slug: row.slug!, partNumber: row.item.partNumber,
              category: row.item.category, description: row.item.description,
              price: row.priceNgn!, inStock: row.inStock!, isActive: true,
              images: [], engineNumbers: row.item.engineNumbers,
            },
          });
        } else if (row.action === "update") {
          await prisma.product.update({
            where: { id: row.productId! },
            data: {
              name: row.item.nameEn, category: row.item.category, description: row.item.description,
              price: row.priceNgn!, inStock: row.inStock!,
              ...(row.item.engineNumbers.length ? { engineNumbers: row.item.engineNumbers } : {}),
            },
          });
        }
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError)) console.error("[inventory publish]", e);
        row.action = "failed";
        row.reason = "ERROR";
      }
    }

    // updatedAt is set to the very same instant so the item doesn't instantly look "changed since publish".
    const ok = plan.filter((r) => r.action === "create" || r.action === "update" || r.action === "unchanged");
    if (ok.length) {
      const now = new Date();
      await prisma.invItem.updateMany({ where: { id: { in: ok.map((r) => r.item.id) } }, data: { publishedAt: now, updatedAt: now } });
    }
    try {
      revalidatePath("/");
      revalidatePath("/catalog");
      plan.filter((r) => r.slug && (r.action === "create" || r.action === "update")).forEach((r) => revalidatePath(`/products/${r.slug}`));
    } catch { /* cache refresh is best-effort */ }
  }

  const counts = { create: 0, update: 0, unchanged: 0, skipped: 0, failed: 0 };
  plan.forEach((r) => (counts[r.action] += 1));
  const rows: PublishRow[] = plan.slice(0, 300).map(({ partNumber, name, action, reason, priceNgn }) => ({ partNumber, name, action, reason, priceNgn }));
  return { dryRun: opts.dryRun, counts, rows };
}
