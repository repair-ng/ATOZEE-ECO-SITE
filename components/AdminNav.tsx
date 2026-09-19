"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminNav({ active }: { active: "products" | "quotes" | "delivery" }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const linkClass = (key: string) =>
    key === active ? "btn-primary !px-3 !py-1.5 text-xs" : "btn-secondary !px-3 !py-1.5 text-xs";

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