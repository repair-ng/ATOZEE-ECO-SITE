"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiUpload } from "@/lib/inv-client";
import { useLang, type Key } from "@/lib/inv-i18n";
import type { ItemVM } from "@/lib/inv-types";
import { formatNaira } from "@/lib/site-config";
import Modal, { Field } from "./Modal";

type ModalState =
  | null
  | { kind: "add" }
  | { kind: "edit"; item: ItemVM }
  | { kind: "stock"; item: ItemVM; type: "ADDED" | "REMOVED" }
  | { kind: "delete"; item: ItemVM }
  | { kind: "bulk" }
  | { kind: "publish"; ids?: string[]; filter?: { q?: string; category?: string; low?: boolean } };

interface ListResp { items: ItemVM[]; total: number; page: number; pageSize: number; categories: string[] }

interface LinkTarget { id: string; partNumber: string; name: string }

// Search-as-you-type picker for "linked with". Items that are themselves linked can't be a link target.
function ItemPicker({ excludeId, value, onChange }: { excludeId?: string; value: LinkTarget | null; onChange: (v: LinkTarget | null) => void }) {
  const { t } = useLang();
  const [q, setQ] = useState("");
  const [res, setRes] = useState<ItemVM[]>([]);
  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const id = setTimeout(async () => {
      try {
        const sp = new URLSearchParams({ q: q.trim(), pageSize: "6" });
        const r = await api<{ items: ItemVM[] }>(`/api/inventory/items?${sp}`);
        setRes(r.items.filter((i) => i.id !== excludeId && !i.link));
      } catch { setRes([]); }
    }, 250);
    return () => clearTimeout(id);
  }, [q, excludeId]);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-slate-300 p-2 text-sm">
        <span><span className="font-mono text-xs">{value.partNumber}</span> {value.name}</span>
        <button type="button" className="px-2 text-red-600" onClick={() => onChange(null)} aria-label="remove link">✕</button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className="input-field" placeholder={t("linkSearch")} maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
      {res.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow">
          {res.map((i) => (
            <li key={i.id}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => { onChange({ id: i.id, partNumber: i.partNumber, name: i.nameEn }); setQ(""); setRes([]); }}>
                <span className="font-mono text-xs">{i.partNumber}</span> {i.nameEn} <span className="text-slate-400">({i.quantity} {i.unit})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemForm({ item, categories, canPrice, onDone, onClose }: {
  item?: ItemVM; categories: string[]; canPrice: boolean; onDone: () => void; onClose: () => void;
}) {
  const { t, err } = useLang();
  const [f, setF] = useState({
    partNumber: item?.partNumber ?? "", nameEn: item?.nameEn ?? "", nameZh: item?.nameZh ?? "",
    category: item?.category ?? "", description: item?.description ?? "", unit: item?.unit ?? "pcs",
    price: String(item?.priceNgn ?? 0), lowStockAt: String(item?.lowStockAt ?? 5),
    invoiceable: item?.invoiceable ?? true, quantity: "0", reason: "",
    engines: (item?.engineNumbers ?? []).join(", "),
    cost: item?.costCny != null ? String(item.costCny) : "",
    margin: item?.marginPct != null ? String(item.marginPct) : "",
    linkQty: String(item?.link?.required ?? 1),
  });
  const [linked, setLinked] = useState(!!item?.link);
  const [target, setTarget] = useState<LinkTarget | null>(item?.link ? { id: item.link.itemId, partNumber: item.link.partNumber, name: item.link.name } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isLinked = linked && !!target;
    const base = {
      partNumber: f.partNumber, nameEn: f.nameEn, nameZh: f.nameZh, category: f.category,
      description: f.description, unit: f.unit, lowStockAt: Number(f.lowStockAt || 0), invoiceable: f.invoiceable,
      engineNumbers: f.engines.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean),
      costCny: f.cost.trim() === "" ? null : Number(f.cost),
      linkedItemId: isLinked ? target!.id : null,
      linkQty: isLinked ? Number(f.linkQty || 1) : null,
      ...(canPrice ? { priceNgn: Number(f.price || 0), marginPct: f.margin.trim() === "" ? null : Number(f.margin) } : {}),
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
      <Field label={t("engineNumbers")}><input className="input-field" value={f.engines} onChange={(e) => set("engines", e.target.value)} placeholder="YC6MK340-36, YC4D120-30" /></Field>
      <div className="grid gap-x-3 sm:grid-cols-3">
        <Field label={t("unit")}><input className="input-field" required maxLength={20} value={f.unit} onChange={(e) => set("unit", e.target.value)} /></Field>
        <Field label={t("costCny")}><input className="input-field" inputMode="decimal" value={f.cost} onChange={(e) => set("cost", e.target.value)} /></Field>
        <Field label={t("lowStockAt")}><input className="input-field" inputMode="numeric" value={f.lowStockAt} onChange={(e) => set("lowStockAt", e.target.value)} /></Field>
      </div>
      {canPrice && (
        <>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label={t("price")}><input className="input-field" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
            <Field label={t("marginOverride")}><input className="input-field" inputMode="decimal" value={f.margin} onChange={(e) => set("margin", e.target.value)} /></Field>
          </div>
          <p className="-mt-1 mb-3 text-xs text-slate-500">{t("costPriceHint")}</p>
        </>
      )}
      <label className="mb-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.invoiceable} onChange={(e) => set("invoiceable", e.target.checked)} /> {t("invoiceable")}
      </label>

      <div className="mb-3 rounded-md border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={linked} onChange={(e) => setLinked(e.target.checked)} /> {t("linkedItem")}
        </label>
        {linked && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-slate-600">{t("linkedWith")}:</p>
            <ItemPicker excludeId={item?.id} value={target} onChange={setTarget} />
            <Field label={t("linkQty")}><input className="input-field max-w-[8rem]" inputMode="numeric" value={f.linkQty} onChange={(e) => set("linkQty", e.target.value)} /></Field>
            <p className="text-xs text-slate-500">{t("linkHint")}</p>
          </div>
        )}
      </div>

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

interface ImportResp {
  summary: { created: number; updated: number; skipped: number; linked: number; errors: number };
  issues: { row: number; partNumber: string; code: string; detail?: string }[];
}

function BulkUploadModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const { t, err } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<ImportResp | null>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true); setError(null); setRes(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("updateExisting", updateExisting ? "1" : "0");
      setRes(await apiUpload<ImportResp>("/api/inventory/import", fd));
    } catch (e) { setError(err(e)); }
    setBusy(false);
  }

  const sm = res?.summary;
  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">{t("uploadHint")}</p>
      <a href="/api/inventory/template" className="btn-secondary mb-4 inline-block" download>{t("downloadTemplate")}</a>
      <Field label={t("chooseFile")}>
        <input ref={fileRef} type="file" className="text-sm" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" disabled={busy} />
      </Field>
      <label className="mb-3 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} disabled={busy} /> {t("updateDetails")}
      </label>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {sm && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded bg-green-100 px-2 py-1 text-green-700">{t("impCreated")}: {sm.created}</span>
            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">{t("impUpdated")}: {sm.updated}</span>
            <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">{t("impSkipped")}: {sm.skipped}</span>
            <span className="rounded bg-purple-100 px-2 py-1 text-purple-700">{t("impLinked")}: {sm.linked}</span>
            <span className="rounded bg-red-100 px-2 py-1 text-red-700">{t("impErrors")}: {sm.errors}</span>
          </div>
          {res.issues.length > 0 && (
            <ul className="mb-3 max-h-48 space-y-1 overflow-auto rounded-md border border-slate-200 p-2 text-xs">
              {res.issues.map((i, n) => (
                <li key={n}>
                  <span className="text-slate-400">{t("impRow")} {i.row}</span> <span className="font-mono">{i.partNumber}</span> — {t(`imp_${i.code}` as Key)}{i.detail ? ` (${i.detail})` : ""}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={res ? onDone : onClose}>{res ? t("publishDone") : t("cancel")}</button>
        <button className="btn-primary" disabled={busy} onClick={upload}>{busy ? t("uploading") : t("bulkUpload")}</button>
      </div>
    </div>
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

interface PubResp {
  dryRun: boolean;
  truncated: boolean;
  counts: { create: number; update: number; unchanged: number; skipped: number; failed: number };
  rows: { partNumber: string; name: string; action: "create" | "update" | "unchanged" | "skipped" | "failed"; reason?: string; priceNgn?: number }[];
}

// Preview first (nothing is written), then confirm. Same dialog for "selected" and "all matching".
function PublishModal({ ids, filter, onDone, onClose }: {
  ids?: string[]; filter?: { q?: string; category?: string; low?: boolean }; onDone: () => void; onClose: () => void;
}) {
  const { t, err } = useLang();
  const [updateExisting, setUpdateExisting] = useState(true);
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [res, setRes] = useState<PubResp | null>(null);
  const [phase, setPhase] = useState<"loading" | "preview" | "publishing" | "done">("loading");
  const [error, setError] = useState<string | null>(null);

  const body = useCallback((dryRun: boolean) => ({
    ...(ids ? { itemIds: ids } : { filter: { ...filter, unpublishedOnly: onlyChanged } }),
    updateExisting, dryRun,
  }), [ids, filter, onlyChanged, updateExisting]);

  useEffect(() => {
    let live = true;
    setPhase("loading"); setError(null);
    api<PubResp>("/api/inventory/publish", { method: "POST", body: body(true) })
      .then((r) => { if (live) { setRes(r); setPhase("preview"); } })
      .catch((e) => { if (live) { setError(err(e)); setPhase("preview"); } });
    return () => { live = false; };
  }, [body, err]);

  async function publish() {
    setPhase("publishing"); setError(null);
    try {
      setRes(await api<PubResp>("/api/inventory/publish", { method: "POST", body: body(false) }));
      setPhase("done");
    } catch (e) { setError(err(e)); setPhase("preview"); }
  }

  const c = res?.counts;
  const todo = (c?.create ?? 0) + (c?.update ?? 0);
  const badge: Record<string, string> = {
    create: "bg-green-100 text-green-700", update: "bg-blue-100 text-blue-700", unchanged: "bg-slate-100 text-slate-600",
    skipped: "bg-amber-100 text-amber-700", failed: "bg-red-100 text-red-700",
  };
  const label: Record<string, string> = {
    create: t("willCreate"), update: t("willUpdate"), unchanged: t("unchangedLbl"), skipped: t("skippedLbl"), failed: t("failedLbl"),
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">{t("publishNote")}</p>
      <label className="mb-2 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={updateExisting} disabled={phase === "publishing" || phase === "done"} onChange={(e) => setUpdateExisting(e.target.checked)} /> {t("updateExisting")}
      </label>
      {!ids && (
        <label className="mb-3 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={onlyChanged} disabled={phase === "publishing" || phase === "done"} onChange={(e) => setOnlyChanged(e.target.checked)} /> {t("onlyChanged")}
        </label>
      )}
      {phase === "loading" && <p className="py-4 text-center text-slate-400">{t("loading")}</p>}
      {c && phase !== "loading" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(["create", "update", "unchanged", "skipped", "failed"] as const).map((k) => (
              <span key={k} className={`rounded px-2 py-1 ${badge[k]}`}>{label[k]}: {c[k]}</span>
            ))}
          </div>
          {res?.truncated && <p className="mb-2 text-xs text-amber-700">{t("truncatedNote")}</p>}
          <div className="mb-3 max-h-56 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100">
                {res?.rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 font-mono">{r.partNumber}</td>
                    <td className="px-2 py-1">{r.name}</td>
                    <td className="px-2 py-1 text-right">{r.priceNgn ? formatNaira(r.priceNgn) : ""}</td>
                    <td className="px-2 py-1"><span className={`rounded px-1.5 py-0.5 ${badge[r.action]}`}>{label[r.action]}</span></td>
                    <td className="px-2 py-1 text-slate-500">{r.reason ? t(`pub_${r.reason}` as Key) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {c && phase === "preview" && todo === 0 && <p className="mb-3 text-sm text-slate-500">{t("nothingToPublish")}</p>}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={phase === "done" ? onDone : onClose}>{phase === "done" ? t("publishDone") : t("cancel")}</button>
        {phase !== "done" && <button className="btn-primary" disabled={phase !== "preview" || todo === 0} onClick={publish}>{phase === "publishing" ? t("loading") : `${t("publishNow")} (${todo})`}</button>}
      </div>
    </div>
  );
}

export default function ItemsClient({ canPublish }: { canPublish: boolean }) {
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pageIds = data?.items.map((i) => i.id) ?? [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const togglePage = () => setSelected((p) => { const n = new Set(p); pageIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const storeStatus = (i: ItemVM) =>
    !i.publishedAt ? "none" : new Date(i.updatedAt).getTime() > new Date(i.publishedAt).getTime() ? "changed" : "on";

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

  const done = () => { setModal(null); setSelected(new Set()); load(); };
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
        <button className="btn-secondary ml-auto" onClick={() => setModal({ kind: "bulk" })}>{t("bulkUpload")}</button>
        <button className="btn-primary" onClick={() => setModal({ kind: "add" })}>{t("addItem")}</button>
      </div>

      {canPublish && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md bg-slate-50 p-2 text-sm">
          <button className="btn-secondary" disabled={selected.size === 0} onClick={() => setModal({ kind: "publish", ids: Array.from(selected) })}>
            {t("publishSelected")} ({selected.size})
          </button>
          <button className="btn-secondary" onClick={() => setModal({ kind: "publish", filter: { q: dq || undefined, category: category || undefined, low: low || undefined } })}>
            {t("publishAll")}
          </button>
          {selected.size > 0 && <button className="text-slate-500 hover:underline" onClick={() => setSelected(new Set())}>{t("clearSel")}</button>}
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {canPublish && <th className="w-8 px-3 py-2"><input type="checkbox" aria-label="select page" checked={allOnPage} onChange={togglePage} /></th>}
              <th className="px-3 py-2">{t("partNo")}</th><th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("category")}</th><th className="px-3 py-2 text-right">{t("qty")}</th>
              <th className="px-3 py-2 text-right">{t("costCny")}</th>
              {canPublish && <th className="px-3 py-2 text-right">{t("price")}</th>}
              {canPublish && <th className="px-3 py-2">{t("storeCol")}</th>}
              <th className="px-3 py-2">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.items.map((i) => {
              const st = storeStatus(i);
              const cls = st === "on" ? "bg-green-100 text-green-700" : st === "changed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500";
              return (
                <tr key={i.id}>
                  {canPublish && <td className="px-3 py-2"><input type="checkbox" aria-label={i.partNumber} checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>}
                  <td className="px-3 py-2 font-mono text-xs">{i.partNumber}</td>
                  <td className="px-3 py-2">
                    {itemName(i)}
                    {i.engineNumbers.length > 0 && (
                      <div className="text-xs text-slate-400">{t("fitsLabel")}: {i.engineNumbers.slice(0, 3).join(", ")}{i.engineNumbers.length > 3 ? ` +${i.engineNumbers.length - 3}` : ""}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{i.category}</td>
                  <td className="px-3 py-2 text-right">
                    {i.quantity} <span className="text-xs text-slate-400">{i.unit}</span>
                    {i.quantity <= i.lowStockAt && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">{t("lowBadge")}</span>}
                    {i.link && (
                      <div className={`text-xs ${i.sellable === 0 ? "text-red-600" : "text-slate-500"}`}>
                        🔗 {i.link.partNumber} ×{i.link.required} ({i.link.linkedQty}) · {t("sellable")} {i.sellable}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{i.costCny != null ? `¥${i.costCny.toLocaleString()}` : "—"}</td>
                  {canPublish && <td className="px-3 py-2 text-right" title={i.priceSource}>{i.sellPriceNgn ? formatNaira(i.sellPriceNgn) : "—"}</td>}
                  {canPublish && <td className="whitespace-nowrap px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{t(st === "on" ? "stOn" : st === "changed" ? "stChanged" : "stNone")}</span></td>}
                  <td className="whitespace-nowrap px-3 py-2">
                    <button className="mr-3 text-green-700 hover:underline" onClick={() => setModal({ kind: "stock", item: i, type: "ADDED" })}>{t("stockIn")}</button>
                    <button className="mr-3 text-amber-700 hover:underline" onClick={() => setModal({ kind: "stock", item: i, type: "REMOVED" })}>{t("stockOut")}</button>
                    <button className="mr-3 text-brand-blue hover:underline" onClick={() => setModal({ kind: "edit", item: i })}>{t("edit")}</button>
                    <button className="text-red-600 hover:underline" onClick={() => setModal({ kind: "delete", item: i })}>{t("del")}</button>
                  </td>
                </tr>
              );
            })}
            {!loading && data?.items.length === 0 && (
              <tr><td colSpan={canPublish ? 9 : 6} className="px-3 py-6 text-center text-slate-500">{t("noItems")}</td></tr>
            )}
            {loading && <tr><td colSpan={canPublish ? 9 : 6} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
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

      {modal?.kind === "add" && <Modal title={t("addTitle")} onClose={() => setModal(null)}><ItemForm canPrice={canPublish} categories={data?.categories ?? []} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "edit" && <Modal title={t("editTitle")} onClose={() => setModal(null)}><ItemForm canPrice={canPublish} item={modal.item} categories={data?.categories ?? []} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "stock" && <Modal title={modal.type === "ADDED" ? t("stockInTitle") : t("stockOutTitle")} onClose={() => setModal(null)}><ReasonForm item={modal.item} type={modal.type} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "bulk" && <Modal title={t("bulkUpload")} onClose={() => setModal(null)}><BulkUploadModal onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "publish" && <Modal title={t("publishTitle")} onClose={() => setModal(null)}><PublishModal ids={modal.ids} filter={modal.filter} onDone={done} onClose={() => setModal(null)} /></Modal>}
      {modal?.kind === "delete" && <Modal title={t("deleteTitle")} onClose={() => setModal(null)}><ReasonForm item={modal.item} remove onDone={done} onClose={() => setModal(null)} /></Modal>}
    </div>
  );
}
