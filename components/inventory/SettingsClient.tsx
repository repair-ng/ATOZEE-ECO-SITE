"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang } from "@/lib/inv-i18n";
import type { SettingsVM } from "@/lib/inv-types";
import { formatNaira } from "@/lib/site-config";
import { Field } from "./Modal";

export default function SettingsClient() {
  const { t, err } = useLang();
  const [rate, setRate] = useState("");
  const [margin, setMargin] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ settings: SettingsVM }>("/api/inventory/settings")
      .then((r) => { setRate(String(r.settings.cnyToNgn)); setMargin(String(r.settings.defaultMarginPct)); setLoaded(true); })
      .catch((e) => setError(err(e)));
  }, [err]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      await api("/api/inventory/settings", { method: "PUT", body: { cnyToNgn: Number(rate), defaultMarginPct: Number(margin || 0) } });
      setSaved(true);
    } catch (e2) { setError(err(e2)); }
    setBusy(false);
  }

  const r = Number(rate) || 0, m = Number(margin) || 0;
  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-2xl font-bold">{t("settingsTitle")}</h1>
      <p className="mb-4 text-sm text-slate-600">{t("settingsHint")}</p>
      {loaded && r <= 0 && <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">{t("rateUnset")}</p>}
      <form onSubmit={save}>
        <Field label={t("rateLabel")}><input className="input-field" inputMode="decimal" required value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label={t("marginLabel")}><input className="input-field" inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} /></Field>
        <p className="mb-4 text-sm text-slate-500">{t("exampleLbl")}: ¥100 → {r > 0 ? formatNaira(Math.round(100 * r * (1 + m / 100))) : "—"}</p>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mb-3 text-sm text-green-700">{t("savedMsg")}</p>}
        <button className="btn-primary" disabled={busy || !loaded}>{t("save")}</button>
      </form>
    </div>
  );
}
