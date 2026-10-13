"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { InvoiceVariant, ItemVM } from "@/lib/inv-types";
import { COMPANY } from "@/lib/inv-company";
import { formatNaira } from "@/lib/site-config";
import Modal, { Field } from "./Modal";

interface Row { id: string; number: string; variant: InvoiceVariant; customerName: string; total: number; createdByName: string; createdAt: string }
interface Line { key: number; itemId: string | null; description: string; quantity: string; unit: string; unitPrice: string; lumpSum: boolean }

function NewInvoice({ onClose }: { onClose: () => void }) {
  const { t, err } = useLang();
  const router = useRouter();
  const nextKey = useRef(1);
  const [variant, setVariant] = useState<InvoiceVariant>("ATOZEE");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [refNo, setRefNo] = useState("");
  const [applyVat, setApplyVat] = useState(true);
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

  const addItem = (i: ItemVM) => {
    // Invoices are English documents, so the description always uses the English name + part number.
    setLines((p) => [...p, { key: nextKey.current++, itemId: i.id, description: `${i.nameEn} (${i.partNumber})`, quantity: "1", unit: i.unit, unitPrice: String(i.priceNgn), lumpSum: false }]);
    setQ(""); setResults([]);
  };
  const addCustom = () => setLines((p) => [...p, { key: nextKey.current++, itemId: null, description: "", quantity: "1", unit: "", unitPrice: "0", lumpSum: false }]);
  const upd = (key: number, patch: Partial<Line>) => setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const lineTotal = (l: Line) => (l.lumpSum ? Number(l.unitPrice) || 0 : (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0));
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const vat = applyVat ? (subtotal * COMPANY.vatRate) / 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ invoice: { id: string } }>("/api/inventory/invoices", {
        method: "POST",
        body: {
          variant, customerName, customerAddress, jobDescription, tinNumber, refNo, applyVat, deductStock,
          lines: lines.map((l) => ({
            itemId: l.itemId, description: l.description, quantity: Number(l.quantity) || 1, unit: l.unit,
            unitPrice: Number(l.unitPrice), lumpSum: l.lumpSum,
          })),
        },
      });
      router.push(`/inventory/invoices/${r.invoice.id}`);
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  const radio = (v: InvoiceVariant, label: string) => (
    <label className={`flex-1 cursor-pointer rounded-md border p-2 text-center text-sm ${variant === v ? "border-brand-blue bg-blue-50 font-medium" : "border-slate-300"}`}>
      <input type="radio" className="sr-only" name="variant" checked={variant === v} onChange={() => setVariant(v)} /> {label}
    </label>
  );

  return (
    <Modal title={t("newInvoice")} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="mb-1 text-sm font-medium text-slate-700">{t("invStyle")}</p>
        <div className="mb-3 flex gap-2">{radio("ATOZEE", t("variantAtozee"))}{radio("ATOZEE_YUCHAI", t("variantYuchai"))}</div>

        <Field label={t("customer")}><input className="input-field" required maxLength={120} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></Field>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label={t("customerAddress")}><input className="input-field" maxLength={200} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></Field>
          <Field label={t("tin")}><input className="input-field" maxLength={40} value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} /></Field>
          <Field label={t("jobDescription")}><input className="input-field" maxLength={300} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} /></Field>
          <Field label={t("refNo")}><input className="input-field" maxLength={60} value={refNo} onChange={(e) => setRefNo(e.target.value)} /></Field>
        </div>

        <div className="relative mb-2">
          <input className="input-field" placeholder={t("pickItem")} value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow">
              {results.map((i) => (
                <li key={i.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => addItem(i)}>
                    <span className="font-mono text-xs">{i.partNumber}</span> {i.nameEn} <span className="text-slate-400">({i.quantity} {i.unit})</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="mb-3 text-sm text-brand-blue hover:underline" onClick={addCustom}>+ {t("customLine")}</button>

        {lines.map((l) => (
          <div key={l.key} className="mb-3 rounded-md border border-slate-200 p-2 text-sm">
            <div className="mb-2 flex gap-2">
              <input className="input-field" aria-label={t("description")} placeholder={t("description")} required maxLength={300} value={l.description} onChange={(e) => upd(l.key, { description: e.target.value })} />
              <button type="button" className="px-2 text-red-600" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label={t("removeLine")}>✕</button>
            </div>
            <div className="grid grid-cols-[4.5rem_5rem_1fr_auto] items-center gap-2">
              <input className="input-field" inputMode="numeric" aria-label={t("quantity")} disabled={l.lumpSum} value={l.lumpSum ? "Lot" : l.quantity} onChange={(e) => upd(l.key, { quantity: e.target.value })} />
              <input className="input-field" aria-label={t("unit")} placeholder={t("unit")} maxLength={20} value={l.lumpSum ? "LS" : l.unit} disabled={l.lumpSum} onChange={(e) => upd(l.key, { unit: e.target.value })} />
              <input className="input-field" inputMode="decimal" aria-label={t("unitPrice")} value={l.unitPrice} onChange={(e) => upd(l.key, { unitPrice: e.target.value })} />
              <span className="w-28 text-right">{formatNaira(lineTotal(l))}</span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={l.lumpSum} onChange={(e) => upd(l.key, { lumpSum: e.target.checked })} /> {t("lumpSum")} (Lot / LS)
            </label>
          </div>
        ))}

        {lines.length > 0 && (
          <div className="mb-3 space-y-1 text-right text-sm">
            <p>{t("subtotalLbl")}: {formatNaira(subtotal)}</p>
            {applyVat && <p>{t("vatLbl")}: {formatNaira(vat)}</p>}
            <p className="font-semibold">{t("grandTotal")}: {formatNaira(subtotal + vat)}</p>
          </div>
        )}

        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={applyVat} onChange={(e) => setApplyVat(e.target.checked)} /> {t("applyVat")}</label>
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

export default function InvoicesClient({ canCreate }: { canCreate: boolean }) {
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
        {canCreate && <button className="btn-primary" onClick={() => setCreating(true)}>{t("newInvoice")}</button>}
      </div>
      {!canCreate && <p className="mb-3 text-sm text-slate-500">{t("viewOnlyNote")}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">{t("invNumber")}</th><th className="px-3 py-2">{t("customer")}</th><th className="px-3 py-2">{t("invStyle")}</th><th className="px-3 py-2">{t("date")}</th><th className="px-3 py-2">{t("issuedBy")}</th><th className="px-3 py-2 text-right">{t("total")}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows?.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2"><Link className="font-mono text-xs text-brand-blue hover:underline" href={`/inventory/invoices/${r.id}`}>{r.number}</Link></td>
                <td className="px-3 py-2">{r.customerName}</td>
                <td className="px-3 py-2 text-slate-500">{r.variant === "ATOZEE_YUCHAI" ? "ATOZEE + YUCHAI" : "ATOZEE"}</td>
                <td className="px-3 py-2 text-slate-500">{fmtDate(r.createdAt)}</td>
                <td className="px-3 py-2 text-slate-500">{r.createdByName}</td>
                <td className="px-3 py-2 text-right">{formatNaira(r.total)}</td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{t("noInvoices")}</td></tr>}
            {!rows && !error && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && <NewInvoice onClose={() => setCreating(false)} />}
    </div>
  );
}
