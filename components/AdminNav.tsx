"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Renders once from app/admin/layout.tsx on every staff page (login
// included), so it can't rely on being told which tab is active via props —
// it detects that itself from the current URL instead. An explicit `active`
// prop is still accepted and takes priority if a caller passes one.
export function AdminNav({ active }: { active?: "products" | "quotes" | "delivery" }) {
  const pathname = usePathname();
  const router = useRouter();

  const detected = active
    ?? (pathname?.startsWith("/admin/products") ? "products"
      : pathname?.startsWith("/admin/quotes") ? "quotes"
      : pathname?.startsWith("/admin/delivery") ? "delivery"
      : undefined);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const linkClass = (key: string) =>
    key === detected ? "btn-primary !px-3 !py-1.5 text-xs" : "btn-secondary !px-3 !py-1.5 text-xs";

  return (
    <div className="flex gap-2">
      <Link href="/admin/products" className={linkClass("products")}>Products</Link>
      <Link href="/admin/quotes" className={linkClass("quotes")}>Quotes</Link>
      <Link href="/admin/delivery" className={linkClass("delivery")}>Delivery rates</Link>
      <button onClick={handleLogout} className="btn-secondary !px-3 !py-1.5 text-xs">
        Log out
      </button>
    </div>
  );
}

// Exported both ways: as a named export (for app/admin/layout.tsx, which
// expects `import { AdminNav } from "..."`) and as the default export (used
// by any page that imports it as `import AdminNav from "..."`) — this
// avoids needing every consumer to use the same import style.
export default AdminNav;
