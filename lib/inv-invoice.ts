import type { InvInvoice } from "@prisma/client";
import type { InvoiceLine, InvoiceVM } from "@/lib/inv-types";

export function serializeInvoice(r: InvInvoice): InvoiceVM {
  return {
    id: r.id, number: r.number, variant: r.variant, customerName: r.customerName,
    customerAddress: r.customerAddress, jobDescription: r.jobDescription, tinNumber: r.tinNumber, refNo: r.refNo,
    lines: r.lines as unknown as InvoiceLine[],
    subtotal: Number(r.subtotal), vatRate: Number(r.vatRate), vatAmount: Number(r.vatAmount), total: Number(r.total),
    paymentStatus: r.paymentStatus, paidAt: r.paidAt?.toISOString() ?? null, paidByName: r.paidByName,
    isError: r.isError, errorReason: r.errorReason, errorFlaggedBy: r.errorFlaggedBy,
    errorFlaggedAt: r.errorFlaggedAt?.toISOString() ?? null, stockDeducted: r.stockDeducted,
    createdByName: r.createdByName, createdAt: r.createdAt.toISOString(),
  };
}
