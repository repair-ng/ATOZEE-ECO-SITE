export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { invoiceSchema } from "@/lib/inv-schemas";
import { blankToNull, round2 } from "@/lib/inv-serialize";
import { applyStock } from "@/lib/inv-stock";
import type { InvoiceLine } from "@/lib/inv-types";

// Yuchai staff are intentionally excluded from every invoice endpoint.
const ROLES = ["ATOZEE_STAFF", "GLOBAL_ADMIN"] as const;

export const GET = inv({ roles: [...ROLES] }, async () => {
  const rows = await prisma.invInvoice.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json({
    invoices: rows.map((r) => ({
      id: r.id, number: r.number, customerName: r.customerName,
      total: Number(r.total), createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
    })),
  });
});

export const POST = inv({ roles: [...ROLES] }, async ({ req, user }) => {
  const b = await readJson(req, invoiceSchema);

  const ids = Array.from(new Set(b.lines.map((l) => l.itemId)));
  const items = await prisma.invItem.findMany({ where: { id: { in: ids }, isDeleted: false } });
  const byId = new Map(items.map((i) => [i.id, i]));

  const lines: InvoiceLine[] = b.lines.map((l) => {
    const item = byId.get(l.itemId);
    if (!item) throw new HttpError(404, "Item not found", "NOT_FOUND");
    if (!item.invoiceable) throw new HttpError(400, `${item.partNumber} can't be invoiced`, "NOT_INVOICEABLE");
    return {
      itemId: item.id, partNumber: item.partNumber, name: item.nameEn,
      quantity: l.quantity, unitPrice: round2(l.unitPrice), lineTotal: round2(l.quantity * l.unitPrice),
    };
  });
  const total = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const number = `ATZ-${ymd}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  const invoice = await prisma.$transaction(async (tx) => {
    if (b.deductStock) {
      for (const l of lines) {
        await applyStock(tx, {
          itemId: l.itemId, type: "REMOVED", quantity: l.quantity, reason: `Invoice ${number}`, user,
        });
      }
    }
    return tx.invInvoice.create({
      data: {
        number, customerName: b.customerName,
        customerContact: blankToNull(b.customerContact) ?? null,
        notes: blankToNull(b.notes) ?? null,
        lines: lines as unknown as Prisma.InputJsonValue, total, createdById: user.id, createdByName: user.displayName,
      },
    });
  });

  return NextResponse.json({ invoice: { id: invoice.id, number: invoice.number } }, { status: 201 });
});
