export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, pageParams, readJson } from "@/lib/inv-guard";
import { createOrRestore, type ItemData } from "@/lib/inv-items";
import { createItemSchema } from "@/lib/inv-schemas";
import { blankToNull, dedupe, ITEM_INCLUDE, round2, serializeItem } from "@/lib/inv-serialize";
import { getPricingSettings } from "@/lib/inv-settings";
import { canSeePricing } from "@/lib/inv-types";
import { itemWhere } from "@/lib/inv-where";

export const GET = inv({}, async ({ req, user }) => {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const category = (sp.get("category") ?? "").trim().slice(0, 80);
  const low = sp.get("low") === "1";
  const invoiceableOnly = sp.get("invoiceable") === "1";
  const { page, pageSize, skip } = pageParams(sp);
  const where = itemWhere({ q, category, low, invoiceableOnly });

  const [items, total, cats, pricing] = await Promise.all([
    prisma.invItem.findMany({
      where, include: ITEM_INCLUDE, orderBy: [{ category: "asc" }, { nameEn: "asc" }], skip, take: pageSize,
    }),
    prisma.invItem.count({ where }),
    prisma.invItem.findMany({
      where: { isDeleted: false }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" },
    }),
    getPricingSettings(),
  ]);

  const show = canSeePricing(user.role);
  return NextResponse.json({
    items: items.map((i) => serializeItem(i, pricing, show)),
    total, page, pageSize,
    categories: cats.map((c) => c.category),
  });
});

export const POST = inv({}, async ({ req, user }) => {
  const b = await readJson(req, createItemSchema);
  const pricingRole = canSeePricing(user.role);
  const d: ItemData = {
    partNumber: b.partNumber,
    nameEn: b.nameEn,
    nameZh: blankToNull(b.nameZh) ?? null,
    category: b.category,
    description: blankToNull(b.description) ?? null,
    unit: b.unit ?? "pcs",
    lowStockAt: b.lowStockAt ?? 5,
    // Selling price / margin belong to Atozee's side — silently ignored for other roles.
    priceNgn: pricingRole ? round2(b.priceNgn ?? 0) : 0,
    marginPct: pricingRole ? b.marginPct ?? null : null,
    costCny: b.costCny ?? null,
    invoiceable: b.invoiceable ?? true,
    engineNumbers: dedupe(b.engineNumbers ?? []),
    linkedItemId: b.linkedItemId || null,
    linkQty: b.linkedItemId ? b.linkQty ?? 1 : null,
  };

  try {
    const created = await prisma.$transaction((tx) => createOrRestore(tx, user, d, b.quantity, b.reason));
    const [item, pricing] = await Promise.all([
      prisma.invItem.findUniqueOrThrow({ where: { id: created.id }, include: ITEM_INCLUDE }),
      getPricingSettings(),
    ]);
    return NextResponse.json({ item: serializeItem(item, pricing, pricingRole) }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
    }
    throw e;
  }
});
