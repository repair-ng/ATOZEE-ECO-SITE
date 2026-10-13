import { revalidatePath } from "next/cache";
import { Prisma, type InvItem } from "@prisma/client";
import { prisma } from "@/lib/db";

export type PublishAction = "create" | "update" | "unchanged" | "skipped" | "failed";
export interface PublishRow {
  partNumber: string;
  name: string;
  action: PublishAction;
  reason?: "NO_PRICE" | "AMBIGUOUS" | "EXISTS" | "ERROR";
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "item";

interface Planned extends PublishRow {
  item: InvItem;
  productId?: string;
  slug?: string;
}

/**
 * Pushes inventory items straight into the store's `products` table
 * (same Postgres). Items are matched to existing products by part number.
 *
 *  - no match            -> a new product is created (active, no images yet)
 *  - match, update on    -> name, category, description, price and in-stock are
 *                           overwritten. Images, slug (URL), engine numbers and
 *                           the active/hidden switch are never touched.
 *  - match, update off   -> skipped
 *  - price is 0          -> skipped (never publish a free product by accident)
 *
 * With dryRun it only reports what would happen.
 */
export async function runPublish(items: InvItem[], opts: { updateExisting: boolean; dryRun: boolean }) {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true, partNumber: true, name: true, category: true, description: true, price: true, inStock: true },
  });
  const byPart = new Map<string, typeof products>();
  for (const p of products) {
    const k = p.partNumber.trim().toLowerCase();
    byPart.set(k, [...(byPart.get(k) ?? []), p]);
  }
  const slugs = new Set(products.map((p) => p.slug));

  const plan: Planned[] = items.map((item) => {
    const base = { item, partNumber: item.partNumber, name: item.nameEn };
    if (Number(item.priceNgn) <= 0) return { ...base, action: "skipped", reason: "NO_PRICE" };
    const matches = byPart.get(item.partNumber.trim().toLowerCase()) ?? [];
    if (matches.length > 1) return { ...base, action: "skipped", reason: "AMBIGUOUS" };
    if (matches.length === 1) {
      const p = matches[0];
      if (!opts.updateExisting) return { ...base, action: "skipped", reason: "EXISTS", productId: p.id };
      const same =
        p.name === item.nameEn && p.category === item.category &&
        (p.description ?? "") === (item.description ?? "") &&
        Number(p.price) === Number(item.priceNgn) && p.inStock === item.quantity > 0;
      return { ...base, action: same ? "unchanged" : "update", productId: p.id, slug: p.slug };
    }
    let slug = slugify(`${item.nameEn}-${item.partNumber}`);
    for (let n = 2; slugs.has(slug); n++) slug = `${slugify(`${item.nameEn}-${item.partNumber}`)}-${n}`;
    slugs.add(slug);
    return { ...base, action: "create", slug };
  });

  if (!opts.dryRun) {
    for (const row of plan) {
      try {
        if (row.action === "create") {
          await prisma.product.create({
            data: {
              name: row.item.nameEn, slug: row.slug!, partNumber: row.item.partNumber,
              category: row.item.category, description: row.item.description,
              price: row.item.priceNgn, inStock: row.item.quantity > 0,
              isActive: true, images: [], engineNumbers: [],
            },
          });
        } else if (row.action === "update") {
          await prisma.product.update({
            where: { id: row.productId! },
            data: {
              name: row.item.nameEn, category: row.item.category, description: row.item.description,
              price: row.item.priceNgn, inStock: row.item.quantity > 0,
            },
          });
        }
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError)) console.error("[inventory publish]", e);
        row.action = "failed";
        row.reason = "ERROR";
      }
    }

    // Record the publish. updatedAt is set to the very same instant so the item
    // doesn't instantly look "changed since publish".
    const ok = plan.filter((r) => r.action === "create" || r.action === "update" || r.action === "unchanged");
    if (ok.length) {
      const now = new Date();
      await prisma.invItem.updateMany({
        where: { id: { in: ok.map((r) => r.item.id) } },
        data: { publishedAt: now, updatedAt: now },
      });
    }
    try {
      revalidatePath("/");
      revalidatePath("/catalog");
      plan.filter((r) => r.slug && (r.action === "create" || r.action === "update")).forEach((r) => revalidatePath(`/products/${r.slug}`));
    } catch { /* cache refresh is best-effort */ }
  }

  const counts = { create: 0, update: 0, unchanged: 0, skipped: 0, failed: 0 };
  plan.forEach((r) => (counts[r.action] += 1));
  const rows: PublishRow[] = plan.slice(0, 300).map(({ partNumber, name, action, reason }) => ({ partNumber, name, action, reason }));
  return { dryRun: opts.dryRun, counts, rows };
}
