"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const initialState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  city: "",
  state: "",
  address: "",
};

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/account";

  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">First name</label>
            <input required className="input-field" value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Last name</label>
            <input required className="input-field" value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" required className="input-field" value={form.email}
            onChange={(e) => update("email", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input type="password" required minLength={8} className="input-field" value={form.password}
            onChange={(e) => update("password", e.target.value)} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Phone number</label>
          <input className="input-field" value={form.phone}
            onChange={(e) => update("phone", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input className="input-field" value={form.city}
              onChange={(e) => update("city", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">State</label>
            <input className="input-field" value={form.state}
              onChange={(e) => update("state", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Address</label>
          <textarea className="input-field" rows={2} value={form.address}
            onChange={(e) => update("address", e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="text-brand-blue hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
