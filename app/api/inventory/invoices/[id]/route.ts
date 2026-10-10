export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, inv } from "@/lib/inv-guard";
import type { InvoiceLine } from "@/lib/inv-types";

export const GET = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ params }) => {
  const r = await prisma.invInvoice.findUnique({ where: { id: params.id } });
  if (!r) throw new HttpError(404, "Invoice not found", "NOT_FOUND");
  return NextResponse.json({
    invoice: {
      id: r.id, number: r.number, customerName: r.customerName,
      customerContact: r.customerContact, notes: r.notes,
      lines: r.lines as unknown as InvoiceLine[], total: Number(r.total),
      createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
    },
  });
});
