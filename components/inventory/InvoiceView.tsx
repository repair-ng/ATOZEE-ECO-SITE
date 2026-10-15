"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { COMPANY } from "@/lib/inv-company";
import { amountInWords, formatInvoiceDate, money } from "@/lib/inv-format";
import { useLang } from "@/lib/inv-i18n";
import { isAdmin, type InvoiceVM, type Role } from "@/lib/inv-types";
import Modal, { Field } from "./Modal";

const MIN_ROWS = 10; // blank rows pad the table so it looks like the paper form

// The invoice itself is an English business document, whatever language the UI is in.
export default function InvoiceView({ id, role }: { id: string; role: Role }) {
  const { t, err, fmtDate } = useLang();
  const router = useRouter();
  const [flagging, setFlagging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reason, setReason] = useState("");
  const [returnStock, setReturnStock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inv, setInv] = useState<InvoiceVM | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ invoice: InvoiceVM }>(`/api/inventory/invoices/${encodeURIComponent(id)}`)
      .then((r) => setInv(r.invoice)).catch((e) => setError(err(e)));
  }, [id, err]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!inv) return <p className="text-slate-400">{t("loading")}</p>;

  async function act(action: "markPaid" | "markPending" | "flagError" | "clearError", why?: string) {
    setBusy(true); setActionError(null);
    try {
      const r = await api<{ invoice: InvoiceVM }>(`/api/inventory/invoices/${encodeURIComponent(id)}`, { method: "PATCH", body: { action, reason: why } });
      setInv(r.invoice); setFlagging(false); setReason("");
    } catch (e) { setActionError(err(e)); }
    setBusy(false);
  }
  async function remove() {
    setBusy(true); setActionError(null);
    try {
      await api(`/api/inventory/invoices/${encodeURIComponent(id)}`, { method: "DELETE", body: { returnStock: returnStock && inv!.stockDeducted } });
      router.push("/inventory/invoices");
    } catch (e) { setActionError(err(e)); setBusy(false); }
  }

  const yc = inv.variant === "ATOZEE_YUCHAI";
  const rows = Array.from({ length: Math.max(MIN_ROWS, inv.lines.length) }, (_, i) => inv.lines[i] ?? null);
  const L = "border-black"; // every rule on the form is black
  const lbl = "font-bold";

  const letterhead = (
    <>
      <div className="font-bold">{COMPANY.name}</div>
      <div>{COMPANY.address}</div>
      <div>Tel: {COMPANY.tel}</div>
      <div>website: {COMPANY.website}</div>
    </>
  );

  return (
    <div className="mx-auto max-w-[794px]">
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          body * { visibility: hidden !important; }
          #invoice-doc, #invoice-doc * { visibility: visible !important; }
          #invoice-doc { position: absolute; left: 0; top: 0; width: 100%; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/inventory/invoices" className="text-sm text-brand-blue hover:underline">← {t("back")}</Link>
        <button className="btn-primary" onClick={() => window.print()}>{t("print")}</button>
      </div>

      <div className="mb-4 space-y-2 text-sm print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-medium ${inv.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>
            {inv.paymentStatus === "PAID" ? t("stPaid") : t("stPending")}
          </span>
          {inv.paymentStatus === "PAID" && inv.paidAt && <span className="text-xs text-slate-500">{t("paidOn")}: {fmtDate(inv.paidAt)} · {inv.paidByName}</span>}
          <button className="btn-secondary" disabled={busy} onClick={() => act(inv.paymentStatus === "PAID" ? "markPending" : "markPaid")}>
            {inv.paymentStatus === "PAID" ? t("markPending") : t("markPaid")}
          </button>
          {inv.isError
            ? <button className="btn-secondary" disabled={busy} onClick={() => act("clearError")}>{t("clearError")}</button>
            : <button className="btn-secondary" disabled={busy} onClick={() => setFlagging(true)}>{t("flagError")}</button>}
          {isAdmin(role) && <button className="btn-primary !bg-red-600" disabled={busy} onClick={() => setDeleting(true)}>{t("deleteInvoice")}</button>}
        </div>
        {inv.isError && (
          <p className="rounded bg-red-50 p-2 text-red-700">
            <b>{t("stError")}:</b> {inv.errorReason} <span className="text-xs text-red-500">— {t("flaggedBy")} {inv.errorFlaggedBy}{inv.errorFlaggedAt ? `, ${fmtDate(inv.errorFlaggedAt)}` : ""}</span>
          </p>
        )}
        {actionError && <p className="text-red-600">{actionError}</p>}
      </div>

      {flagging && (
        <Modal title={t("flagError")} onClose={() => setFlagging(false)}>
          <form onSubmit={(e) => { e.preventDefault(); act("flagError", reason); }}>
            <Field label={t("errorReasonLbl")}><textarea className="input-field" rows={3} required minLength={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setFlagging(false)}>{t("cancel")}</button>
              <button className="btn-primary" disabled={busy}>{t("confirm")}</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title={t("deleteInvoice")} onClose={() => setDeleting(false)}>
          <p className="mb-3 text-sm text-red-700">{t("confirmDeleteInv")}</p>
          {inv.stockDeducted && (
            <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={returnStock} onChange={(e) => setReturnStock(e.target.checked)} /> {t("returnStock")}</label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setDeleting(false)}>{t("cancel")}</button>
            <button className="btn-primary !bg-red-600" disabled={busy} onClick={remove}>{t("deleteInvoice")}</button>
          </div>
        </Modal>
      )}

      <div id="invoice-doc" className={`border ${L} bg-white text-[12px] leading-snug text-black`}>
        {/* Letterhead — differs between the two styles */}
        <div className={`grid grid-cols-2 border-b ${L}`}>
          <div className={`flex flex-col items-start justify-center border-r ${L} p-3`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/invoice/atozee-logo.png" alt="ATOZEE" className="h-16 w-auto" />
            <span className="ml-1 font-bold">RC {COMPANY.rc}</span>
          </div>
          {yc ? (
            <div className="flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/invoice/yuchai-logo.png" alt="YC Diesel" className="h-16 w-auto" />
            </div>
          ) : (
            <div className="flex flex-col justify-center p-3 text-center text-[11px]">{letterhead}</div>
          )}
        </div>
        {yc && (
          <div className={`border-b ${L} p-2 text-center text-[11px]`}>
            {COMPANY.address}<br />Tel: {COMPANY.tel}<br />website: {COMPANY.website}
          </div>
        )}

        {/* Customer / invoice details */}
        <div className={`grid grid-cols-[1.35fr_1fr] border-b ${L}`}>
          <div className={`border-r ${L}`}>
            <div className={`border-b ${L} p-2`}><span className={lbl}>CUSTOMER NAME:</span> {inv.customerName}</div>
            <div className={`border-b ${L} p-2`}><span className={lbl}>CUSTOMER ADDRESS:</span> {inv.customerAddress}</div>
            <div className="min-h-[44px] p-2"><span className={lbl}>JOB DESCRIPTION:</span> {inv.jobDescription}</div>
          </div>
          <div>
            <div className={`flex justify-between border-b ${L} p-2`}><span className={lbl}>INVOICE NO:</span><span className="font-bold">{inv.number}</span></div>
            <div className={`border-b ${L} p-2`}><span className={lbl}>TIN NUMBER:</span> {inv.tinNumber}</div>
            <div className={`flex justify-between border-b ${L} p-2`}><span className={lbl}>DATE:</span><span>{formatInvoiceDate(inv.createdAt)}</span></div>
            <div className="min-h-[28px] p-2"><span className={lbl}>REF. NO.:</span> {inv.refNo}</div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full border-collapse">
          <thead>
            <tr className={`border-b ${L} text-center font-bold`}>
              <th className={`w-12 border-r ${L} p-1`}>ITEM</th>
              <th className={`border-r ${L} p-1`}>DESCRIPTION</th>
              <th className={`w-14 border-r ${L} p-1`}>QTY</th>
              <th className={`w-14 border-r ${L} p-1`}>UNIT</th>
              <th className={`w-28 border-r ${L} p-1`}>UNIT PRICE (₦)</th>
              <th className="w-28 p-1">AMOUNT (₦)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={i} className={`h-7 border-b ${L} align-top`}>
                <td className={`border-r ${L} p-1 text-center`}>{l ? i + 1 : ""}</td>
                <td className={`border-r ${L} p-1`}>{l?.description}</td>
                <td className={`border-r ${L} p-1 text-center`}>{l ? (l.lumpSum ? "Lot" : l.quantity) : ""}</td>
                <td className={`border-r ${L} p-1 text-center`}>{l ? (l.lumpSum ? "" : l.unit) : ""}</td>
                <td className={`border-r ${L} p-1 text-right`}>{l ? (l.lumpSum ? "LS" : money(l.unitPrice)) : ""}</td>
                <td className="p-1 text-right">{l ? money(l.lineTotal) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals + bank details */}
        <div className={`grid grid-cols-[1.35fr_1fr] border-b ${L}`}>
          <div className={`border-r ${L} p-2`}>
            <p><span className={lbl}>BANK:</span> {COMPANY.bank}</p>
            <p><span className={lbl}>ACCOUNT NAME:</span> {COMPANY.accountName}</p>
            <p><span className={lbl}>ACCOUNT NUMBER:</span> <b>{COMPANY.accountNo}</b></p>
          </div>
          <div>
            <div className={`flex justify-between border-b ${L} p-2 font-bold`}><span>SUBTOTAL EXCL VAT:</span><span>{money(inv.subtotal)}</span></div>
            <div className={`flex justify-between border-b ${L} p-2`}><span className="font-bold">VAT {inv.vatRate}%</span><span className="font-bold">{money(inv.vatAmount)}</span></div>
            <div className="flex justify-between p-2 font-bold"><span>GRAND TOTAL:</span><span>{money(inv.total)}</span></div>
          </div>
        </div>
        <div className={`border-b ${L} p-2`}><span className={lbl}>AMOUNT IN WORDS:</span> <b>{amountInWords(inv.total)}.</b></div>

        {/* Sign-off. Left blank above the name for a wet signature. */}
        <div className={`grid ${yc ? "grid-cols-2" : "grid-cols-1"}`}>
          <div className={`${yc ? `border-r ${L}` : ""} flex min-h-[90px] flex-col justify-end p-2`}>
            <b>{yc ? `SIGN: ${COMPANY.signatory}.` : COMPANY.signatory}</b>
            {!yc && <span>FOR: A TOZEE FACILITIES SERVICES LIMITED</span>}
          </div>
          {yc && <div className="flex min-h-[90px] items-end p-2 italic font-bold">RECEIVED:</div>}
        </div>
      </div>
    </div>
  );
}
