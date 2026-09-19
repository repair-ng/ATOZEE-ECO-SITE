"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const [status, setStatus] = useState<"loading" | "paid" | "failed" | "error">("loading");

  useEffect(() => {
    if (!reference) {
      setStatus("error");
      return;
    }
    fetch(`/api/checkout/verify?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((data) => setStatus(data.paid ? "paid" : "failed"))
      .catch(() => setStatus("error"));
  }, [reference]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {status === "loading" && <p>Confirming your payment…</p>}
      {status === "paid" && (
        <>
          <h1 className="mb-3 text-2xl font-bold text-green-700">Payment successful</h1>
          <p className="mb-6 text-slate-600">Thanks for your order — we'll be in touch about delivery/pickup.</p>
          <Link href="/account" className="btn-primary">View my orders</Link>
        </>
      )}
      {status === "failed" && (
        <>
          <h1 className="mb-3 text-2xl font-bold text-red-700">Payment not confirmed</h1>
          <p className="mb-6 text-slate-600">
            We couldn't confirm this payment. If you were charged, please contact us.
          </p>
          <Link href="/cart" className="btn-secondary">Back to cart</Link>
        </>
      )}
      {status === "error" && <p className="text-red-600">Something went wrong verifying your payment.</p>}
    </div>
  );
}
