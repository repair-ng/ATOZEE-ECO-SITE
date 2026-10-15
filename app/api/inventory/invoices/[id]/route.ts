export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv, readJson } from "@/lib/inv-guard";
import { serializeInvoice } from "@/lib/inv-invoice";
import { invoiceActionSchema, invoiceDeleteSchema } from "@/lib/inv-schemas";
import { applyStock } from "@/lib/inv-stock";
import type { InvoiceLine } from "@/lib/inv-types";

export const GET = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ params }) => {
  const r = await prisma.invInvoice.findUnique({ where: { id: params.id } });
  if (!r) throw new HttpError(404, "Invoice not found", "NOT_FOUND");
  return NextResponse.json({ invoice: serializeInvoice(r) });
});

// Payment status and error flag. Invoice contents are never edited — a wrong invoice is flagged, then deleted and re-issued.
export const PATCH = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ req, user, params }) => {
  const b = await readJson(req, invoiceActionSchema);
  let data: Prisma.InvInvoiceUpdateManyMutationInput;
  switch (b.action) {
    case "markPaid":
      data = { paymentStatus: "PAID", paidAt: new Date(), paidByName: user.displayName };
      break;
    case "markPending":
      data = { paymentStatus: "PENDING", paidAt: null, paidByName: null };
      break;
    case "flagError":
      if (!b.reason) throw new HttpError(400, "reason: Please say what is wrong", "VALIDATION");
      data = { isError: true, errorReason: b.reason, errorFlaggedBy: user.displayName, errorFlaggedAt: new Date() };
      break;
    default:
      data = { isError: false, errorReason: null, errorFlaggedBy: null, errorFlaggedAt: null };
  }
  const r = await prisma.invInvoice.updateMany({ where: { id: params.id }, data });
  if (r.count === 0) throw new HttpError(404, "Invoice not found", "NOT_FOUND");
  const inv2 = await prisma.invInvoice.findUniqueOrThrow({ where: { id: params.id } });
  return NextResponse.json({ invoice: serializeInvoice(inv2) });
});

// Only the global admin can delete. Optionally puts the stock the invoice took back (logged in the stock log).
export const DELETE = inv({ roles: ["GLOBAL_ADMIN"] }, async ({ req, user, params }) => {
  const b = await readJson(req, invoiceDeleteSchema);
  const result = await prisma.$transaction(async (tx) => {
    const r = await tx.invInvoice.findUnique({ where: { id: params.id } });
    if (!r) throw new HttpError(404, "Invoice not found", "NOT_FOUND");
    let returned = 0, skipped = 0;
    if (b.returnStock && r.stockDeducted) {
      for (const l of r.lines as unknown as InvoiceLine[]) {
        if (!l.itemId) continue;
        try {
          await applyStock(tx, { itemId: l.itemId, type: "ADDED", quantity: l.quantity, reason: `Invoice ${r.number} deleted`, user });
          returned++;
        } catch (e) {
          if (e instanceof HttpError) skipped++; // item has since been deleted — nothing to return stock to
          else throw e;
        }
      }
    }
    await tx.invInvoice.delete({ where: { id: r.id } });
    return { returned, skipped };
  }, { timeout: 20_000 });
  return NextResponse.json({ ok: true, ...result });
});
