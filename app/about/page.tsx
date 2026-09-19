import { siteConfig } from "@/lib/site-config";

export default function AboutPage() {
  const hasContactInfo = Boolean(
    siteConfig.address || siteConfig.phoneDisplay || siteConfig.contactEmail
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-2xl font-bold">About AToZEE</h1>
      <p className="mb-8 text-slate-600">
        AToZEE supplies genuine engine parts matched to your exact engine number — not just a
        general model family — so you get the right part the first time, every time.
      </p>

      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-1 font-semibold text-brand-blue">Engine-specific matching</h3>
          <p className="text-sm text-slate-600">
            Search by your engine number, not just a model name, so you never guess whether a
            part actually fits.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-1 font-semibold text-brand-blue">Delivery or pickup</h3>
          <p className="text-sm text-slate-600">
            Get parts delivered to your state at a transparent, published rate — or pick up
            free at our location.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-1 font-semibold text-brand-blue">Quotes for bulk orders</h3>
          <p className="text-sm text-slate-600">
            Large or made-to-order orders go through a proper quote, so pricing always reflects
            what you're actually getting.
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Get in touch</h2>
      {hasContactInfo ? (
        <div className="rounded-md border border-slate-200 p-4 text-sm text-slate-600">
          {siteConfig.address && <p className="mb-1">{siteConfig.address}</p>}
          {siteConfig.phoneDisplay && <p className="mb-1">Phone: {siteConfig.phoneDisplay}</p>}
          {siteConfig.contactEmail && <p>Email: {siteConfig.contactEmail}</p>}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Contact details haven&apos;t been set up yet — add{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_ADDRESS</code>,{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_PHONE_DISPLAY</code>,
          and/or{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_CONTACT_EMAIL</code>{" "}
          to your environment file to show them here.
        </p>
      )}
    </div>
  );
}
