"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatNaira } from "@/lib/site-config";

interface Rate {
  state: string;
  price: string;
}

export default function AdminDeliveryPage() {
  const router = useRouter();
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [newState, setNewState] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/delivery");
    if (res.status === 401) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setRates(data.rates);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (unauthorized) router.push("/admin/login");
  }, [unauthorized, router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newState || !newPrice) {
      setError("State and price are required.");
      return;
    }
    const res = await fetch("/api/admin/delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: newState, price: Number(newPrice) }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
      return;
    }
    setNewState("");
    setNewPrice("");
    load();
  }

  async function handleDelete(state: string) {
    await fetch("/api/admin/delivery", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    load();
  }

  if (loading) return <div className="px-4 py-12 text-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery rates</h1>
        <div className="flex gap-2">
          <Link href="/admin/products" className="btn-secondary">Products</Link>
          <Link href="/admin/quotes" className="btn-secondary">Quotes</Link>
        </div>
      </div>

      <form onSubmit={handleAdd} className="mb-8 flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">State</label>
          <input
            className="input-field"
            value={newState}
            onChange={(e) => setNewState(e.target.value)}
            placeholder="e.g. Rivers"
          />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-sm font-medium">Fee (NGN)</label>
          <input
            type="number"
            className="input-field"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">Add / update</button>
      </form>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {rates.map((r) => (
          <li key={r.state} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{r.state}</span>
            <span>{formatNaira(Number(r.price))}</span>
            <button
              onClick={() => handleDelete(r.state)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
        {rates.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No delivery rates configured yet.
          </li>
        )}
      </ul>
    </div>
  );
}
