"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuoteFields = {
  status: string;
  fobPrice?: number;
  shippingCost?: number;
  shippingCbm?: number;
  freightClearingCost?: number;
  localDeliveryCost?: number;
  quotedTotal?: number;
};

export function QuoteEditor({ quoteId, initial }: { quoteId: string; initial: QuoteFields }) {
  const router = useRouter();
  const [fields, setFields] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof QuoteFields>(key: K, value: QuoteFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const numberField = (key: keyof QuoteFields, label: string) => (
    <div className="field" key={key}>
      <label htmlFor={key}>{label}</label>
      <input
        id={key}
        type="number"
        step="0.01"
        value={fields[key] ?? ""}
        onChange={(e) => update(key, e.target.value ? parseFloat(e.target.value) : undefined)}
      />
    </div>
  );

  return (
    <div className="card" style={{ padding: 16 }}>
      <h3 style={{ fontSize: 16 }}>Landed cost breakdown</h3>
      {numberField("fobPrice", "FOB price (NGN)")}
      {numberField("shippingCost", "Shipping cost (NGN)")}
      {numberField("shippingCbm", "Shipping CBM")}
      {numberField("freightClearingCost", "Freight & clearing cost (NGN)")}
      {numberField("localDeliveryCost", "Local delivery cost (NGN)")}
      {numberField("quotedTotal", "Quoted total (NGN)")}

      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" value={fields.status} onChange={(e) => update("status", e.target.value)}>
          <option value="pending">Pending</option>
          <option value="quoted">Quoted</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
      </button>
    </div>
  );
}
