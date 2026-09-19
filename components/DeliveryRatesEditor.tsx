"use client";

import { useState } from "react";
import { NIGERIAN_STATES, formatNgn } from "@/lib/site-config";

type Rate = { state: string; price: number };

export function DeliveryRatesEditor({ initialRates }: { initialRates: Rate[] }) {
  const [rates, setRates] = useState<Record<string, number | "">>(
    Object.fromEntries(NIGERIAN_STATES.map((s) => [s, initialRates.find((r) => r.state === s)?.price ?? ""]))
  );
  const [savingState, setSavingState] = useState<string | null>(null);
  const [savedState, setSavedState] = useState<string | null>(null);

  async function handleSave(state: string) {
    const price = rates[state];
    if (price === "" || price === undefined) return;

    setSavingState(state);
    setSavedState(null);
    try {
      const res = await fetch("/api/admin/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, price }),
      });
      if (res.ok) {
        setSavedState(state);
        setTimeout(() => setSavedState(null), 1500);
      }
    } finally {
      setSavingState(null);
    }
  }

  return (
    <div className="card" style={{ padding: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>
            <th style={{ padding: 8 }}>State</th>
            <th style={{ padding: 8 }}>Fee (NGN)</th>
            <th style={{ padding: 8 }} />
          </tr>
        </thead>
        <tbody>
          {NIGERIAN_STATES.map((state) => (
            <tr key={state} style={{ borderBottom: "1px solid var(--color-border)" }}>
              <td style={{ padding: 8 }}>{state}</td>
              <td style={{ padding: 8 }}>
                <input
                  type="number"
                  min={0}
                  value={rates[state]}
                  onChange={(e) =>
                    setRates((r) => ({ ...r, [state]: e.target.value ? parseFloat(e.target.value) : "" }))
                  }
                  style={{ width: 120, padding: 6, border: "1px solid var(--color-border)", borderRadius: 4 }}
                />
                {typeof rates[state] === "number" && (
                  <span style={{ marginLeft: 8, color: "var(--color-muted)" }}>
                    {formatNgn(rates[state] as number)}
                  </span>
                )}
              </td>
              <td style={{ padding: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => handleSave(state)}
                  disabled={savingState === state || rates[state] === ""}
                >
                  {savingState === state ? "Saving…" : savedState === state ? "Saved ✓" : "Save"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
