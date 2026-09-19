"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import DeliveryMethodSelector, { DeliveryMethod } from "@/components/DeliveryMethodSelector";
import AuthGate from "@/components/AuthGate";
import { formatNaira } from "@/lib/site-config";

export default function CartPage() {
  const { items, subtotal, allInStock, removeItem, setQuantity, clear } = useCart();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [method, setMethod] = useState<DeliveryMethod>("pickup");
  const [state, setState] = useState("");
  const [address, setAddress] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false))
      .finally(() => setCheckedAuth(true));
  }, []);

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        deliveryMethod: method,
        deliveryState: state,
        deliveryAddress: address,
      };

      const initRes = await fetch("/api/checkout/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const initData = await initRes.json();

      if (!initRes.ok) {
        setSubmitError(initData.error || "Something went wrong.");
        return;
      }

      if (initData.path === "instant_checkout") {
        clear();
        window.location.href = initData.authorizationUrl;
        return;
      }

      // Falls back to a quote request
      const quoteRes = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const quoteData = await quoteRes.json();
      if (!quoteRes.ok) {
        setSubmitError(quoteData.error || "Something went wrong.");
        return;
      }
      clear();
      router.push("/quote/success");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <p className="text-slate-500">Browse the catalog to find parts for your engine.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Your cart</h1>

      <ul className="mb-8 divide-y divide-slate-200 rounded-md border border-slate-200">
        {items.map((i) => (
          <li key={i.productId} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{i.name}</p>
              {!i.inStock && <p className="text-xs text-amber-600">Made to order</p>}
            </div>
            <input
              type="number"
              min={1}
              value={i.quantity}
              onChange={(e) => setQuantity(i.productId, Math.max(1, Number(e.target.value)))}
              className="input-field w-20"
            />
            <span className="w-24 text-right font-medium">{formatNaira(i.price * i.quantity)}</span>
            <button onClick={() => removeItem(i.productId)} className="text-sm text-red-600 hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mb-8 flex justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span>{formatNaira(subtotal)}</span>
      </div>

      <div className="mb-8">
        <DeliveryMethodSelector
          method={method}
          onMethodChange={setMethod}
          state={state}
          onStateChange={setState}
          address={address}
          onAddressChange={setAddress}
        />
      </div>

      {!allInStock && (
        <p className="mb-4 text-sm text-amber-600">
          One or more items is made to order — this will go through as a quote request rather
          than instant checkout.
        </p>
      )}

      {submitError && <p className="mb-4 text-sm text-red-600">{submitError}</p>}

      {checkedAuth && (
        <AuthGate isLoggedIn={isLoggedIn} onProceed={handleSubmit} returnTo="/cart">
          <button disabled={submitting} className="btn-primary w-full">
            {submitting ? "Processing…" : isLoggedIn ? "Continue to checkout" : "Log in to continue"}
          </button>
        </AuthGate>
      )}
    </div>
  );
}
