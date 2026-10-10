import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InvShell from "@/components/inventory/InvShell";
import { getSessionUser } from "@/lib/inv-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory", robots: { index: false, follow: false } };

// Server-side gate for every inventory page (the API routes check again on their own).
export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/inventory/login");
  return <InvShell user={user}>{children}</InvShell>;
}
