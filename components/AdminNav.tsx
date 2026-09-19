"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div style={{ background: "var(--color-blue-dark)", color: "white" }}>
      <div
        className="container"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 52, fontSize: 14 }}
      >
        <div style={{ display: "flex", gap: 20 }}>
          <strong>AToZEE Staff</strong>
          <Link href="/admin/quotes" style={{ color: "white" }}>
            Quotes
          </Link>
          <Link href="/admin/delivery" style={{ color: "white" }}>
            Delivery rates
          </Link>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.4)", color: "white", borderRadius: 6, padding: "4px 10px" }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
