"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/site-config";

interface QuoteDetail {
  id: string;
  status: string;
  items: { productId: string; quantity: number }[];
  notes: string | null;
  deliveryMethod: string;
  deliveryFee: string | null;
  deliveryAddress: string | null;
  fobPrice: string | null;
  shippingCost: string | null;
  shippingCbm: string | null;
  freightClearingCost: string | null;
  localDeliveryCost: string | null;
  quotedTotal: string | null;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
}

export default function AdminQuoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [form, setForm] = useState({
    fobPrice: "",
    shippingCost: "",
    shippingCbm: "",
    freightClearingCost: "",
    localDeliveryCost: "",
    quotedTotal: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/quotes/${params.id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          throw new Error("unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        setQuote(data.quote);
        setForm({
          fobPrice: data.quote.fobPrice ?? "",
          shippingCost: data.quote.shippingCost ?? "",
          shippingCbm: data.quote.shippingCbm ?? "",
          freightClearingCost: data.quote.freightClearingCost ?? "",
          localDeliveryCost: data.quote.localDeliveryCost ?? "",
          quotedTotal: data.quote.quotedTotal ?? "",
        });
      })
      .catch(() => null);
  }, [params.id, router]);

  async function handleSave(status?: string) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v !== "") payload[k] = Number(v);
      }
      if (status) payload.status = status;

      const res = await fetch(`/api/admin/quotes/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setQuote(data.quote);
    } finally {
      setSaving(false);
    }
  }

  if (!quote) return <div className="px-4 py-12 text-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Quote {quote.id.slice(0, 8).toUpperCase()}</h1>
      <p className="mb-6 text-slate-600">
        {quote.user.firstName} {quote.user.lastName} — {quote.user.email}
        {quote.user.phone ? ` — ${quote.user.phone}` : ""}
      </p>

      <div className="mb-6 rounded-md border border-slate-200 p-4">
        <p className="mb-1 text-sm font-semibold">
          {quote.deliveryMethod === "delivery" ? "Delivery" : "Pickup"}
        </p>
        {quote.deliveryMethod === "delivery" && (
          <>
            <p className="text-sm text-slate-600">Address: {quote.deliveryAddress}</p>
            {quote.deliveryFee && (
              <p className="text-sm text-slate-600">
                Delivery fee: {formatNaira(Number(quote.deliveryFee))}
              </p>
            )}
          </>
        )}
        {quote.notes && <p className="mt-2 text-sm text-slate-600">Notes: {quote.notes}</p>}
      </div>

      <h2 className="mb-3 font-semibold">Quote pricing breakdown</h2>
      <div className="mb-6 grid grid-cols-2 gap-4">
        {(
          [
            ["fobPrice", "FOB price"],
            ["shippingCost", "Shipping cost"],
            ["shippingCbm", "Shipping CBM"],
            ["freightClearingCost", "Freight/clearing cost"],
            ["localDeliveryCost", "Local delivery cost"],
            ["quotedTotal", "Quoted total"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input
              type="number"
              className="input-field"
              value={form[key]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button disabled={saving} onClick={() => handleSave()} className="btn-secondary">
          Save breakdown
        </button>
        <button disabled={saving} onClick={() => handleSave("quoted")} className="btn-primary">
          Save & mark as sent
        </button>
      </div>

      <p className="mt-4 text-sm text-slate-500">Current status: {quote.status}</p>
    </div>
  );
}
