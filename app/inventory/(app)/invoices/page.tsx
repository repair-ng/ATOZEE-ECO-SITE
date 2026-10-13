import { redirect } from "next/navigation";
import InvoicesClient from "@/components/inventory/InvoicesClient";
import { getSessionUser } from "@/lib/inv-auth";
import { canCreateInvoices, canViewInvoices } from "@/lib/inv-types";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user || !canViewInvoices(user.role)) redirect("/inventory"); // Yuchai staff can't see invoices
  return <InvoicesClient canCreate={canCreateInvoices(user.role)} />;
}
