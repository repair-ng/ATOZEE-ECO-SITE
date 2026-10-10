"use client";

import { useState } from "react";
import { api } from "@/lib/inv-client";
import { LangProvider, LanguageToggle, useLang } from "@/lib/inv-i18n";
import type { Lang } from "@/lib/inv-types";

function Form() {
  const { t, err, lang } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/inventory/auth/login", { method: "POST", body: { username, password } });
      // Carry the language chosen on this screen into the account.
      await api("/api/inventory/me", { method: "PATCH", body: { language: lang } }).catch(() => {});
      window.location.assign("/inventory");
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
        <LanguageToggle />
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input className="input-field" placeholder={t("username")} autoComplete="username" required maxLength={64}
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input-field" type="password" placeholder={t("password")} autoComplete="current-password"
          required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? t("loading") : t("signIn")}</button>
      </form>
    </div>
  );
}

export default function LoginForm({ initialLang }: { initialLang: Lang }) {
  return (
    <LangProvider initial={initialLang} persist={false}>
      <Form />
    </LangProvider>
  );
}
