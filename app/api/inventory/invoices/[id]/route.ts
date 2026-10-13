export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, inv } from "@/lib/inv-guard";
import type { InvoiceLine, InvoiceVM } from "@/lib/inv-types";

export const GET = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ params }) => {
  const r = await prisma.invInvoice.findUnique({ where: { id: params.id } });
  if (!r) throw new HttpError(404, "Invoice not found", "NOT_FOUND");
  const invoice: InvoiceVM = {
    id: r.id, number: r.number, variant: r.variant, customerName: r.customerName,
    customerAddress: r.customerAddress, jobDescription: r.jobDescription, tinNumber: r.tinNumber, refNo: r.refNo,
    lines: r.lines as unknown as InvoiceLine[],
    subtotal: Number(r.subtotal), vatRate: Number(r.vatRate), vatAmount: Number(r.vatAmount), total: Number(r.total),
    createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
  };
  return NextResponse.json({ invoice });
});
