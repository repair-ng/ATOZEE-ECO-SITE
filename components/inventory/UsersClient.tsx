"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/inv-client";
import { useLang, type Key } from "@/lib/inv-i18n";
import { ROLES, type Role, type UserVM } from "@/lib/inv-types";
import Modal, { Field } from "./Modal";

function UserForm({ user, onDone, onClose }: { user?: UserVM; onDone: () => void; onClose: () => void }) {
  const { t, err } = useLang();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "YUCHAI_STAFF");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (user) {
        await api(`/api/inventory/users/${user.id}`, {
          method: "PATCH",
          body: { displayName, role, isActive, ...(password ? { password } : {}) },
        });
      } else {
        await api("/api/inventory/users", { method: "POST", body: { username, displayName, role, password } });
      }
      onDone();
    } catch (e2) {
      setError(err(e2));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} autoComplete="off">
      {!user && <Field label={t("username")}><input className="input-field" required maxLength={32} value={username} onChange={(e) => setUsername(e.target.value)} /></Field>}
      <Field label={t("displayName")}><input className="input-field" required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
      <Field label={t("roleLabel")}>
        <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => <option key={r} value={r}>{t(`role${r}` as Key)}</option>)}
        </select>
      </Field>
      {user && <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> {t("active")}</label>}
      <Field label={user ? t("newPassword") : t("password")}>
        <input className="input-field" type="password" autoComplete="new-password" required={!user} minLength={10} maxLength={128}
          placeholder={t("passwordHint")} value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>{t("cancel")}</button>
        <button className="btn-primary" disabled={busy}>{t("save")}</button>
      </div>
    </form>
  );
}

export default function UsersClient({ currentUserId }: { currentUserId: string }) {
  const { t, err, fmtDate } = useLang();
  const [users, setUsers] = useState<UserVM[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { user?: UserVM }>(null);

  const load = useCallback(() => {
    api<{ users: UserVM[] }>("/api/inventory/users").then((r) => setUsers(r.users)).catch((e) => setError(err(e)));
  }, [err]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("usersTitle")}</h1>
        <button className="btn-primary" onClick={() => setModal({})}>{t("addUser")}</button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">{t("displayName")}</th><th className="px-3 py-2">{t("username")}</th><th className="px-3 py-2">{t("roleLabel")}</th><th className="px-3 py-2">{t("status")}</th><th className="px-3 py-2">{t("createdAt")}</th><th className="px-3 py-2">{t("actions")}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.displayName}{u.id === currentUserId && " ★"}</td>
                <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                <td className="px-3 py-2">{t(`role${u.role}` as Key)}</td>
                <td className="px-3 py-2">{u.isActive ? <span className="text-green-700">{t("active")}</span> : <span className="text-red-600">{t("disabled")}</span>}</td>
                <td className="px-3 py-2 text-slate-500">{fmtDate(u.createdAt)}</td>
                <td className="px-3 py-2"><button className="text-brand-blue hover:underline" onClick={() => setModal({ user: u })}>{t("edit")}</button></td>
              </tr>
            ))}
            {!users && !error && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">{t("loading")}</td></tr>}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal.user ? t("edit") : t("addUser")} onClose={() => setModal(null)}>
          <UserForm user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />
        </Modal>
      )}
    </div>
  );
}
