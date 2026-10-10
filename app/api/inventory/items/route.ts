export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, pageParams, readJson } from "@/lib/inv-guard";
import { createItemSchema } from "@/lib/inv-schemas";
import { blankToNull, round2, serializeItem } from "@/lib/inv-serialize";

export const GET = inv({}, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const category = (sp.get("category") ?? "").trim().slice(0, 80);
  const low = sp.get("low") === "1";
  const invoiceableOnly = sp.get("invoiceable") === "1";
  const { page, pageSize, skip } = pageParams(sp);

  const where: Prisma.InvItemWhereInput = {
    isDeleted: false,
    ...(category ? { category } : {}),
    ...(invoiceableOnly ? { invoiceable: true } : {}),
    ...(low ? { quantity: { lte: prisma.invItem.fields.lowStockAt } } : {}),
    ...(q
      ? {
          OR: [
            { partNumber: { contains: q, mode: "insensitive" } },
            { nameEn: { contains: q, mode: "insensitive" } },
            { nameZh: { contains: q } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total, cats] = await Promise.all([
    prisma.invItem.findMany({ where, orderBy: [{ category: "asc" }, { nameEn: "asc" }], skip, take: pageSize }),
    prisma.invItem.count({ where }),
    prisma.invItem.findMany({
      where: { isDeleted: false }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" },
    }),
  ]);

  return NextResponse.json({
    items: items.map(serializeItem),
    total, page, pageSize,
    categories: cats.map((c) => c.category),
  });
});

export const POST = inv({}, async ({ req, user }) => {
  const b = await readJson(req, createItemSchema);
  const data = {
    nameEn: b.nameEn,
    nameZh: blankToNull(b.nameZh) ?? null,
    category: b.category,
    description: blankToNull(b.description) ?? null,
    unit: b.unit ?? "pcs",
    lowStockAt: b.lowStockAt ?? 5,
    priceNgn: round2(b.priceNgn ?? 0),
    invoiceable: b.invoiceable ?? true,
  };

  try {
    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.invItem.findUnique({ where: { partNumber: b.partNumber } });
      let created;
      if (existing) {
        // A previously deleted part number can be re-added (restores the row, keeps its history).
        if (!existing.isDeleted) throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
        created = await tx.invItem.update({
          where: { id: existing.id },
          data: { ...data, quantity: b.quantity, isDeleted: false },
        });
      } else {
        created = await tx.invItem.create({ data: { ...data, partNumber: b.partNumber, quantity: b.quantity } });
      }
      await tx.invMovement.create({
        data: {
          itemId: created.id, partNumber: created.partNumber, itemName: created.nameEn,
          type: "ADDED", quantity: b.quantity, balanceAfter: b.quantity,
          reason: b.reason, userId: user.id, username: user.username,
        },
      });
      return created;
    });
    return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "Part number already exists", "DUPLICATE_PART");
    }
    throw e;
  }
});
