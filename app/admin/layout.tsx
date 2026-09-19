import { AdminNav } from "@/components/AdminNav";

// Auth is checked per-page (see app/admin/quotes/page.tsx, app/admin/delivery/page.tsx)
// rather than here, since this layout also wraps /admin/login itself and we don't
// want a redirect loop on the login page.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminNav />
      <div className="container" style={{ padding: "24px 20px" }}>
        {children}
      </div>
    </div>
  );
}
