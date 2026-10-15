export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { COMPANY } from "@/lib/inv-company";
import { lagosDayCompact } from "@/lib/inv-format";
import { HttpError, inv, pageParams, readJson } from "@/lib/inv-guard";
import { invoiceSchema } from "@/lib/inv-schemas";
import { blankToNull, round2 } from "@/lib/inv-serialize";
import { applyStock } from "@/lib/inv-stock";
import type { InvoiceLine, InvoiceRowVM } from "@/lib/inv-types";

// Atozee staff create invoices. The global admin can look at them; Yuchai staff can't see them at all.
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Filters: status (PENDING | PAID | ERROR), free text (number / customer / job), style, date range.
export const GET = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ req }) => {
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") ?? "";
  const variant = sp.get("variant") ?? "";
  const q = (sp.get("q") ?? "").trim().slice(0, 100);
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  const { page, pageSize, skip } = pageParams(sp);

  const createdAt: Prisma.DateTimeFilter = {};
  if (DATE.test(from)) createdAt.gte = new Date(`${from}T00:00:00.000Z`);
  if (DATE.test(to)) createdAt.lt = new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000);

  const where: Prisma.InvInvoiceWhereInput = {
    ...(status === "PENDING" || status === "PAID" ? { paymentStatus: status } : {}),
    ...(status === "ERROR" ? { isError: true } : {}),
    ...(variant === "ATOZEE" || variant === "ATOZEE_YUCHAI" ? { variant } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { customerName: { contains: q, mode: "insensitive" } },
            { jobDescription: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total, sum] = await Promise.all([
    prisma.invInvoice.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.invInvoice.count({ where }),
    prisma.invInvoice.aggregate({ where, _sum: { total: true } }),
  ]);
  const invoices: InvoiceRowVM[] = rows.map((r) => ({
    id: r.id, number: r.number, variant: r.variant, customerName: r.customerName, total: Number(r.total),
    paymentStatus: r.paymentStatus, isError: r.isError, createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
  }));
  return NextResponse.json({ invoices, total, page, pageSize, sumTotal: Number(sum._sum.total ?? 0) });
});

export const POST = inv({ roles: ["ATOZEE_STAFF"] }, async ({ req, user }) => {
  const b = await readJson(req, invoiceSchema);

  const ids = Array.from(new Set(b.lines.map((l) => l.itemId).filter((x): x is string => !!x)));
  const items = ids.length ? await prisma.invItem.findMany({ where: { id: { in: ids }, isDeleted: false } }) : [];
  const byId = new Map(items.map((i) => [i.id, i]));

  const lines: InvoiceLine[] = b.lines.map((l) => {
    let partNumber: string | null = null;
    if (l.itemId) {
      const item = byId.get(l.itemId);
      if (!item) throw new HttpError(404, "Item not found", "NOT_FOUND");
      if (!item.invoiceable) throw new HttpError(400, `${item.partNumber} can't be invoiced`, "NOT_INVOICEABLE");
      partNumber = item.partNumber;
    }
    const lumpSum = !!l.lumpSum;
    const quantity = lumpSum ? 1 : l.quantity;
    return {
      itemId: l.itemId || null, partNumber, description: l.description, quantity,
      unit: (l.unit ?? "").trim(), unitPrice: round2(l.unitPrice),
      lineTotal: round2(lumpSum ? l.unitPrice : quantity * l.unitPrice), lumpSum,
    };
  });

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const vatRate = b.applyVat ? COMPANY.vatRate : 0;
  const vatAmount = round2((subtotal * vatRate) / 100);
  const total = round2(subtotal + vatAmount);

  const invoice = await prisma.$transaction(async (tx) => {
    // Serial number: yyyymmdd-001, -002 ... Incremented atomically in the same
    // transaction as the invoice, so a failed invoice (e.g. not enough stock)
    // rolls the counter back too and numbers never collide or skip.
    const day = lagosDayCompact();
    const rows = await tx.$queryRaw<{ last: number }[]>`
      INSERT INTO inv_invoice_counters ("day", "last") VALUES (${day}, 1)
      ON CONFLICT ("day") DO UPDATE SET "last" = inv_invoice_counters."last" + 1
      RETURNING "last"`;
    const number = `${day}-${String(rows[0].last).padStart(3, "0")}`;

    if (b.deductStock) {
      for (const l of lines) {
        if (!l.itemId) continue; // custom lines (delivery, services) have no stock
        await applyStock(tx, { itemId: l.itemId, type: "REMOVED", quantity: l.quantity, reason: `Invoice ${number}`, user });
      }
    }
    return tx.invInvoice.create({
      data: {
        number, variant: b.variant, customerName: b.customerName,
        customerAddress: blankToNull(b.customerAddress) ?? null,
        jobDescription: blankToNull(b.jobDescription) ?? null,
        tinNumber: blankToNull(b.tinNumber) ?? null,
        refNo: blankToNull(b.refNo) ?? null,
        lines: lines as unknown as Prisma.InputJsonValue,
        subtotal, vatRate, vatAmount, total,
        // Remember whether stock was taken, so deleting the invoice can offer to put it back.
        stockDeducted: b.deductStock && lines.some((l) => !!l.itemId),
        createdById: user.id, createdByName: user.displayName,
      },
    });
  }, { timeout: 20_000 });

  return NextResponse.json({ invoice: { id: invoice.id, number: invoice.number } }, { status: 201 });
});
