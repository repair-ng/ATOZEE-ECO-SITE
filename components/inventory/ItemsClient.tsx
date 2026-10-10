"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { ItemVM } from "@/lib/inv-types";
import { formatNaira } from "@/lib/site-config";
import Modal, { Field } from "./Modal";

type ModalState =
  | null
  | { kind: "add" }
  | { kind: "edit"; item: ItemVM }
  | { kind: "stock"; item: ItemVM; type: "ADDED" | "REMOVED" }
  | { kind: "delete"; item: ItemVM };

interface ListResp { items: ItemVM[]; total: number; page: number; pageSize: number; categories: string[] }

function ItemForm({ item, categories, onDone, onClose }: {
  item?: ItemVM; categories: string[]; onDone: () => void; onClose: () => void;
}) {
  const { t, err } = useLang();
  const [f, setF] = useState({
    partNumber: item?.partNumber ?? "", nameEn: item?.nameEn ?? "", nameZh: item?.nameZh ?? "",
    category: item?.category ?? "", description: item?.description ?? "", unit: item?.unit ?? "pcs",
    price: String(item?.priceNgn ?? 0), lowStockAt: String(item?.lowStockAt ?? 5),
    invoiceable: item?.invoiceable ?? true, quantity: "0", reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const base = {
      partNumber: f.partNumber, nameEn: f.nameEn, nameZh: f.nameZh, category: f.category,
      description: f.description, unit: f.unit, priceNgn: Number(f.price || 0),
      lowStockAt: Number(f.lowStockAt || 0), invoiceable: f.invoiceable,
    };
    try {
      if (item) await api(`/api/inventory/items/${item.id}`, { method: "PATCH", body: base });
      else await api("/api/inventory/items", { method: "POST", body: { ...base, quantity: Number(f.quantity || 0), reason: f.reason } });
      onDone();
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <Field label={t("partNo")}><input className="input-field" required maxLength={60} value={f.partNumber} onChange={(e) => set("partNumber", e.target.value)} /></Field>
        <Field label={t("category")}>
          <input className="input-field" required maxLength={80} list="inv-cats" value={f.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="inv-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
      </div>
      <Field label={t("nameEn")}><input className="input-field" required maxLength={160} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} /></Field>
      <Field label={t("nameZh")}><input className="input-field" maxLength={160} value={f.nameZh} onChange={(e) => set("nameZh", e.target.value)} /></Field>
      <Field label={t("description")}><textarea className="input-field" rows={2} maxLength={2000} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <Field label={t("unit")}><input className="input-field" required maxLength={20} value={f.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
        <Field label={t("price")}><input className="input-field" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label={t("lowStockAt")}><input className="input-field" inputMode="numeric" value={f.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} /></Field>
      </div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.invoiceable} onChange={(e) => set("invoiceable", e.target.checked)} /> {t("invoiceable")}
      </label>
      {!item && (
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Field label={t("startQty")}><input className="input-field" inputMode="numeric" value={f.quantity} onChange={(e) => set("quantity", e.target.value)} /></Field>
          <Field label={t("reason")}><input className="input-field" required minLength={3} maxLength={300} placeholder={t("reasonHint")} value={f.reason} onChange={(e) => set("reason", e.target.value)} /></Field>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
        <button className="btn-primary" disabled={busy}>{t("save")}</button>
      </div>
    </form>
  );
}

function ReasonForm({ item, type, remove, onDone, onClose }: {
  item: ItemVM; type?: "ADDED" | "REMOVED"; remove?: boolean; onDone: () => void; onClose: () => void;
}) {
  const { t, err } = useLang();
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (remove) await api(`/api/inventory/items/${item.id}`, { method: "DELETE", body: { reason } });
      else await api(`/api/inventory/items/${item.id}/stock`, { method: "POST", body: { type, quantity: Number(qty), reason } });
      onDone();
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <p className="mb-3 text-sm text-slate-600">
        <span className="font-medium">{item.partNumber}</span> — {item.nameEn}<br />
        {t("currentStock")}: {item.quantity} {item.unit}
      </p>
      {remove ? <p className="mb-3 text-sm text-red-700">{t("confirmDelete")}</p> : (
        <Field label={t("quantity")}><input className="input-field" inputMode="numeric" required value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
      )}
      <Field label={t("reason")}><input className="input-field" required minLength={3} maxLength={300} placeholder={t("reasonHint")} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
        <button className={remove ? "btn-primary !bg-red-600" : "btn-primary"} disabled={busy}>{t("confirm")}</button>
      </div>
    </form>
  );
}

export default function ItemsClient() {
  const { t, err, itemName } = useLang();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [category, setCategory] = useState("");
  const [low, setLow] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    const id = setTimeout(() => { setDq(q); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ page: String(page) });
      if (dq) sp.set("q", dq);
      if (category) sp.set("category", category);
      if (low) sp.set("low", "1");
      setData(await api<ListResp>(`/api/inventory/items?${sp}`));
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  }, [page, dq, category, low, err]);

  useEffect(() => { load(); }, [load]);

  const done = () => { setModal(null); load(); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input type="search" className="input-field max-w-xs" placeholder={t("search")} value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
        <select className="input-field w-auto" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">{t("allCategories")}</option>
          {data?.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={low} onChange={(e) => { setLow(e.target.checked); setPage(1); }} /> {t("lowOnly")}
        </label>
        <button className="btn-primary ml-auto" onClick={() => setModal({ kind: "add" })}>{t("addItem")}</button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">{t("partNo")}</th><th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("category")}</th><th className="px-3 py-2 text-right">{t("qty")}</th>
              <th className="px-3 py-2 text-right">{t("price")}</th><th className="px-3 py-2">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((i) => (
              <tr key={i.id}>
                <td className="px-3 py-2 font-mono text-xs">{i.partNumber}</td>
                <td className="px-3 py-2">{itemName(i)}</td>
                <td className="px-3 py-2 text-slate-500">{i.category}</td>
                <td className="px-3 py-2 text-right">
                  {i.quantity} <span className="text-xs text-slate-400">{i.unit}</span>
                  {i.quantity <= i.lowStockAt && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">{t("lowBadge")}</span>}
                </td>
                <td className="px-3 py-2 text-right">{formatNaira(i.priceNgn)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <button className="mr-3 text-green-700 hover:underline" onClick={() => setModal({ kind: "stock", item: i, type: "ADDED" })}>{t("stockIn")}</button>
                  <button className="mr-3 text-amber-700 hover:underline" onClick={() => setModal({ kind: "stock", item: i, type: "REMOVED" })}>{t("stockOut")}</button>
                  <button className="mr-3 text-brand-blue hover:underline" onClick={() => setModal({ kind: "edit", item: i })}>{t("edit")}</button>
                  <button className="text-red-600 hover:underline" onClick={() => setModal({ kind: "delete", item: i })}>{t("del")}</button>
                </td>
              </tr>
            ))}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">{t("noItems")}</td></tr>
            )}
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
        <span>{data?.total ?? 0}</span>
        <div className="flex items-center gap-3">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("prev")}</button>
          <span>{page} / {pages}</span>
          <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t("next")}</button>
        </div>
      </div>

      {modal?.kind === "add" && <Modal title={t("addTitle")} onClose={() => setModal(null)}><ItemForm categories={data?.categories ?? []} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "edit" && <Modal title={t("editTitle")} onClose={() => setModal(null)}><ItemForm item={modal.item} categories={data?.categories ?? []} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "stock" && <Modal title={modal.type === "ADDED" ? t("stockInTitle") : t("stockOutTitle")} onClose={() => setModal(null)}><ReasonForm item={modal.item} type={modal.type} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "delete" && <Modal title={t("deleteTitle")} onClose={() => setModal(null)}><ReasonForm item={modal.item} remove onDone={done} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}
