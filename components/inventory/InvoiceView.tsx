"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { InvoiceVM } from "@/lib/inv-types";
import { formatNaira } from "@/lib/site-config";

export default function InvoiceView({ id }: { id: string }) {
  const { t, err, fmtDate } = useLang();
  const [inv, setInv] = useState<InvoiceVM | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ invoice: InvoiceVM }>(`/api/inventory/invoices/${encodeURIComponent(id)}`)
      .then((r) => setInv(r.invoice)).catch((e) => setError(err(e)));
  }, [id, err]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!inv) return <p className="text-slate-400">{t("loading")}</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/inventory/invoices" className="text-sm text-brand-blue hover:underline">← {t("back")}</Link>
        <button className="btn-primary" onClick={() => window.print()}>{t("print")}</button>
      </div>
      <div className="rounded-md border border-slate-200 p-8 print:border-0 print:p-0">
        <div className="mb-6 flex items-start justify-between">
          <h1 className="font-heading text-3xl font-bold text-brand-blue">ATOZEE</h1>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold">{inv.number}</p>
            <p className="text-slate-500">{fmtDate(inv.createdAt)}</p>
          </div>
        </div>
        <div className="mb-6 text-sm">
          <p className="text-xs uppercase text-slate-400">{t("customer")}</p>
          <p className="font-medium">{inv.customerName}</p>
          {inv.customerContact && <p className="text-slate-500">{inv.customerContact}</p>}
        </div>
        <table className="mb-4 w-full text-sm">
          <thead className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
            <tr><th className="py-2">{t("partNo")}</th><th className="py-2">{t("name")}</th><th className="py-2 text-right">{t("qty")}</th><th className="py-2 text-right">{t("unitPrice")}</th><th className="py-2 text-right">{t("lineTotal")}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inv.lines.map((l) => (
              <tr key={l.itemId}>
                <td className="py-2 font-mono text-xs">{l.partNumber}</td><td className="py-2">{l.name}</td>
                <td className="py-2 text-right">{l.quantity}</td><td className="py-2 text-right">{formatNaira(l.unitPrice)}</td>
                <td className="py-2 text-right">{formatNaira(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right text-lg font-semibold">{t("total")}: {formatNaira(inv.total)}</p>
        {inv.notes && <p className="mt-6 whitespace-pre-wrap text-sm text-slate-600">{inv.notes}</p>}
        <p className="mt-8 text-xs text-slate-400">{t("issuedBy")}: {inv.createdByName}</p>
      </div>
    </div>
  );
}
