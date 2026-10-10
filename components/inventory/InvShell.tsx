"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/inv-client";
import { LangProvider, LanguageToggle, useLang, type Key } from "@/lib/inv-i18n";
import { canInvoice, isAdmin, type SessionUserVM } from "@/lib/inv-types";

function Inner({ user, children }: { user: SessionUserVM; children: React.ReactNode }) {
  const { t } = useLang();
  const path = usePathname();
  const router = useRouter();

  const links: { href: string; label: Key; show: boolean }[] = [
    { href: "/inventory", label: "navItems", show: true },
    { href: "/inventory/movements", label: "navLog", show: true },
    { href: "/inventory/invoices", label: "navInvoices", show: canInvoice(user.role) },
    { href: "/inventory/users", label: "navUsers", show: isAdmin(user.role) },
  ];

  async function logout() {
    await api("/api/inventory/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/inventory/login");
    router.refresh();
  }

  return (
    <div>
      <div className="border-b border-slate-200 bg-slate-50 print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-heading text-lg font-bold text-brand-blue">{t("appTitle")}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {links.filter((l) => l.show).map((l) => {
              const active = l.href === "/inventory" ? path === l.href : path.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href}
                  className={active ? "font-semibold text-brand-blue" : "text-slate-600 hover:text-brand-blue"}>
                  {t(l.label)}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <LanguageToggle />
            <span className="hidden text-slate-600 sm:inline">
              {user.displayName} · {t(`role${user.role}` as Key)}
            </span>
            <button onClick={logout} className="text-red-600 hover:underline">{t("logout")}</button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

export default function InvShell({ user, children }: { user: SessionUserVM; children: React.ReactNode }) {
  return (
    <LangProvider initial={user.language} persist>
      <Inner user={user}>{children}</Inner>
    </LangProvider>
  );
}
