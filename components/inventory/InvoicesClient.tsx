"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { ItemVM } from "@/lib/inv-types";
import { formatNaira } from "@/lib/site-config";
import Modal, { Field } from "./Modal";

interface Row { id: string; number: string; customerName: string; total: number; createdByName: string; createdAt: string }
interface Line { itemId: string; partNumber: string; name: string; quantity: string; unitPrice: string }

function NewInvoice({ onClose }: { onClose: () => void }) {
  const { t, err, itemName } = useLang();
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [notes, setNotes] = useState("");
  const [deductStock, setDeductStock] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ItemVM[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const id = setTimeout(async () => {
      try {
        const sp = new URLSearchParams({ q: q.trim(), invoiceable: "1", pageSize: "8" });
        setResults((await api<{ items: ItemVM[] }>(`/api/inventory/items?${sp}`)).items);
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const addLine = (i: ItemVM) => {
    setLines((p) => p.some((l) => l.itemId === i.id) ? p : [...p, { itemId: i.id, partNumber: i.partNumber, name: itemName(i), quantity: "1", unitPrice: String(i.priceNgn) }]);
    setQ(""); setResults([]);
  };
  const upd = (idx: number, k: "quantity" | "unitPrice", v: string) =>
    setLines((p) => p.map((l, n) => (n === idx ? { ...l, [k]: v } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ invoice: { id: string } }>("/api/inventory/invoices", {
        method: "POST",
        body: {
          customerName, customerContact, notes, deductStock,
          lines: lines.map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        },
      });
      router.push(`/inventory/invoices/${r.invoice.id}`);
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  return (
    <Modal title={t("newInvoice")} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label={t("customer")}><input className="input-field" required maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
        <Field label={t("contact")}><input className="input-field" maxLength={120} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} /></Field>

        <div className="relative mb-3">
          <input className="input-field" placeholder={t("pickItem")} value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow">
              {results.map((i) => (
                <li key={i.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => addLine(i)}>
                    <span className="font-mono text-xs">{i.partNumber}</span> {itemName(i)} <span className="text-slate-400">({i.quantity} {i.unit})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-slate-400">{t("invoiceOnlyNote")}</p>
        </div>

        {lines.map((l, idx) => (
          <div key={l.itemId} className="mb-2 grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-center gap-2 text-sm">
            <span className="truncate" title={l.name}><span className="font-mono text-xs">{l.partNumber}</span> {l.name}</span>
            <input className="input-field" inputMode="numeric" aria-label={t("quantity")} value={l.quantity} onChange={(e) => upd(idx, "quantity", e.target.value)} />
            <input className="input-field" inputMode="decimal" aria-label={t("unitPrice")} value={l.unitPrice} onChange={(e) => upd(idx, "unitPrice", e.target.value)} />
            <button type="button" className="text-red-600" onClick={() => setLines((p) => p.filter((_, n) => n !== idx))} aria-label={t("removeLine")}>✕</button>
          </div>
        ))}
        {lines.length > 0 && <p className="mb-3 text-right text-sm font-semibold">{t("total")}: {formatNaira(total)}</p>}

        <Field label={t("notes")}><textarea className="input-field" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={deductStock} onChange={(e) => setDeductStock(e.target.checked)} /> {t("deductStock")}</label>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
          <button className="btn-primary" disabled={busy || lines.length === 0}>{t("createInvoice")}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function InvoicesClient() {
  const { t, err, fmtDate } = useLang();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api<{ invoices: Row[] }>("/api/inventory/invoices").then((r) => setRows(r.invoices)).catch((e) => setError(err(e)));
  }, [err]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("invoicesTitle")}</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>{t("newInvoice")}</button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">{t("invNumber")}</th><th className="px-3 py-2">{t("customer")}</th><th className="px-3 py-2">{t("date")}</th><th className="px-3 py-2">{t("issuedBy")}</th><th className="px-3 py-2 text-right">{t("total")}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2"><Link className="font-mono text-xs text-brand-blue hover:underline" href={`/inventory/invoices/${r.id}`}>{r.number}</Link></td>
                <td className="px-3 py-2">{r.customerName}</td>
                <td className="px-3 py-2 text-slate-500">{fmtDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-slate-500">{r.createdByName}</td>
                <td className="px-3 py-2 text-right">{formatNaira(r.total)}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">{t("noInvoices")}</td></tr>}
            {!rows && !error && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && <NewInvoice onClose={() => setCreating(false)} />}
    </div>
  );
}
