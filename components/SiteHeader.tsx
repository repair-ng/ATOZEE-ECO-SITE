"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

interface Props {
  user: { firstName: string; email: string } | null;
}

export default function SiteHeader({ user }: Props) {
  const { items } = useCart();
  const router = useRouter();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* /public/logo.png to be supplied — falls back to a text
              wordmark styled in the same red/blue split in the meantime. */}
          <span className="font-heading text-2xl font-bold tracking-tight">
            <span className="text-brand-red">A</span>
            <span className="text-brand-blue">To</span>
            <span className="text-brand-red">ZEE</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <Link href="/catalog" className="hover:text-brand-blue">Catalog</Link>
          <Link href="/about" className="hover:text-brand-blue">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative text-slate-700 hover:text-brand-blue">
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-3 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-xs text-white">
                {itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/account" className="text-sm font-medium text-slate-700 hover:text-brand-blue">
                {user.firstName}
              </Link>
              <button onClick={handleLogout} className="btn-secondary !px-3 !py-1.5 text-xs">
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary !px-3 !py-1.5 text-xs">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary !px-3 !py-1.5 text-xs">
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
