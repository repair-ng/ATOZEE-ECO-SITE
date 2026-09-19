import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const hasContactInfo = Boolean(
    siteConfig.address || siteConfig.phoneDisplay || siteConfig.contactEmail
  );

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <span className="font-heading text-xl font-bold tracking-tight">
              <span className="text-brand-red">A</span>
              <span className="text-brand-blue">To</span>
              <span className="text-brand-red">ZEE</span>
            </span>
            <p className="mt-2 text-sm text-slate-500">
              Genuine engine parts, matched to your exact engine number.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Quick links</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              <li><Link href="/catalog" className="hover:text-brand-blue">Catalog</Link></li>
              <li><Link href="/about" className="hover:text-brand-blue">About</Link></li>
              <li><Link href="/cart" className="hover:text-brand-blue">Cart</Link></li>
              <li><Link href="/account" className="hover:text-brand-blue">My account</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Contact</h3>
            {hasContactInfo ? (
              <ul className="space-y-1 text-sm text-slate-600">
                {siteConfig.address && <li>{siteConfig.address}</li>}
                {siteConfig.phoneDisplay && <li>{siteConfig.phoneDisplay}</li>}
                {siteConfig.contactEmail && (
                  <li>
                    <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-brand-blue">
                      {siteConfig.contactEmail}
                    </a>
                  </li>
                )}
                {siteConfig.whatsappNumber && (
                  <li>
                    <a
                      href={`https://wa.me/${siteConfig.whatsappNumber.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-blue"
                    >
                      WhatsApp us
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Contact details coming soon.</p>
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-400">
          © {year} AToZEE. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
