"use client";

import { useEffect, useState } from "react";
import { formatNaira } from "@/lib/site-config";

export type DeliveryMethod = "delivery" | "pickup";

interface Props {
  method: DeliveryMethod;
  onMethodChange: (method: DeliveryMethod) => void;
  state: string;
  onStateChange: (state: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
}

export default function DeliveryMethodSelector({
  method,
  onMethodChange,
  state,
  onStateChange,
  address,
  onAddressChange,
}: Props) {
  const [fee, setFee] = useState<number | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);

  useEffect(() => {
    if (method !== "delivery" || !state) {
      setFee(null);
      return;
    }
    setLoadingFee(true);
    setFeeError(null);
    const controller = new AbortController();
    fetch(`/api/delivery-rate?state=${encodeURIComponent(state)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.available) {
          setFee(data.fee);
        } else {
          setFee(null);
          setFeeError(data.message || "Delivery isn't available for that state yet.");
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") setFeeError("Couldn't calculate delivery fee.");
      })
      .finally(() => setLoadingFee(false));
    return () => controller.abort();
  }, [method, state]);

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold">Delivery or pickup?</h3>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onMethodChange("delivery")}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
            method === "delivery"
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-slate-300 text-slate-700"
          }`}
        >
          Delivery
        </button>
        <button
          type="button"
          onClick={() => onMethodChange("pickup")}
          className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium ${
            method === "pickup"
              ? "border-brand-blue bg-brand-blue text-white"
              : "border-slate-300 text-slate-700"
          }`}
        >
          Pickup (free)
        </button>
      </div>

      {method === "delivery" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">State</label>
            <input
              type="text"
              className="input-field"
              value={state}
              onChange={(e) => onStateChange(e.target.value)}
              placeholder="e.g. Lagos"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Delivery address
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Defaults to your profile address"
            />
          </div>
          {loadingFee && <p className="text-xs text-slate-500">Calculating delivery fee…</p>}
          {feeError && <p className="text-xs text-red-600">{feeError}</p>}
          {fee !== null && (
            <p className="text-sm font-medium">
              Delivery fee: <span className="text-brand-blue">{formatNaira(fee)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
