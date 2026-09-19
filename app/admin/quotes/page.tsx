"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface QuoteVM {
  id: string;
  status: string;
  deliveryMethod: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
}

export default function AdminQuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<QuoteVM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/quotes")
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          throw new Error("unauthorized");
        }
        return res.json();
      })
      .then((data) => setQuotes(data.quotes))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="px-4 py-12 text-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quote requests</h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className="btn-secondary">Products</Link>
          <Link href="/admin/delivery" className="btn-secondary">Delivery rates</Link>
        </div>
      </div>

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {quotes.map((q) => (
          <li key={q.id}>
            <Link
              href={`/admin/quotes/${q.id}`}
              className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
            >
              <span className="part-plate">{q.id.slice(0, 8).toUpperCase()}</span>
              <span>{q.user.firstName} {q.user.lastName}</span>
              <span className="capitalize">{q.deliveryMethod}</span>
              <span className="capitalize">{q.status}</span>
              <span className="text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</span>
            </Link>
          </li>
        ))}
        {quotes.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No quote requests yet.</li>
        )}
      </ul>
    </div>
  );
}
