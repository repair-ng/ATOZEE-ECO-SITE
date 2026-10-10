"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { MovementVM } from "@/lib/inv-types";

interface Resp { movements: MovementVM[]; total: number; page: number; pageSize: number }

export default function MovementsClient() {
  const { t, err, fmtDate } = useLang();
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [who, setWho] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dq, setDq] = useState("");
  const [dwho, setDwho] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => { setDq(q); setDwho(who); setPage(1); }, 300);
    return () => clearTimeout(id);
  }, [q, who]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ page: String(page), pageSize: "50" });
      if (type) sp.set("type", type);
      if (dq) sp.set("q", dq);
      if (dwho) sp.set("user", dwho);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      setData(await api<Resp>(`/api/inventory/movements?${sp}`));
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  }, [page, type, dq, dwho, from, to, err]);

  useEffect(() => { load(); }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const clear = () => { setType(""); setQ(""); setWho(""); setFrom(""); setTo(""); setPage(1); };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("logTitle")}</h1>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <select className="input-field w-auto" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">{t("allTypes")}</option>
          <option value="ADDED">{t("added")}</option>
          <option value="REMOVED">{t("removed")}</option>
        </select>
        <input className="input-field max-w-[14rem]" placeholder={t("searchLog")} maxLength={100} value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input-field max-w-[10rem]" placeholder={t("filterUser")} maxLength={64} value={who} onChange={(e) => setWho(e.target.value)} />
        <label className="text-xs text-slate-500">{t("from")}<input type="date" className="input-field" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} /></label>
        <label className="text-xs text-slate-500">{t("to")}<input type="date" className="input-field" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} /></label>
        <button className="btn-secondary" onClick={clear}>{t("clearFilters")}</button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">{t("date")}</th><th className="px-3 py-2">{t("type")}</th>
              <th className="px-3 py-2">{t("partNo")}</th><th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2 text-right">{t("qty")}</th><th className="px-3 py-2 text-right">{t("balance")}</th>
              <th className="px-3 py-2">{t("reason")}</th><th className="px-3 py-2">{t("by")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data?.movements.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-3 py-2 text-slate-500">{fmtDate(m.createdAt)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${m.type === "ADDED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {m.type === "ADDED" ? t("added") : t("removed")}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{m.partNumber}</td>
                <td className="px-3 py-2">{m.itemName}</td>
                <td className="px-3 py-2 text-right">{m.type === "ADDED" ? "+" : "−"}{m.quantity}</td>
                <td className="px-3 py-2 text-right">{m.balanceAfter}</td>
                <td className="px-3 py-2">{m.reason}</td>
                <td className="px-3 py-2 text-slate-500">{m.username}</td>
              </tr>
            ))}
            {!loading && data?.movements.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">{t("noItems")}</td></tr>}
            {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
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
    </div>
  );
}
