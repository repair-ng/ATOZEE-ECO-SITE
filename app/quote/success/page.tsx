import Link from "next/link";

export default function QuoteSuccessPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="mb-3 text-2xl font-bold">Quote request received</h1>
      <p className="mb-6 text-slate-600">
        Our team will review your request and send a quote to your email shortly. You can
        track its status from your account page.
      </p>
      <Link href="/account" className="btn-primary">
        View my account
      </Link>
    </div>
  );
}
