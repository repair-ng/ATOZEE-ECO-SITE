import { redirect } from "next/navigation";
import InvoicesClient from "@/components/inventory/InvoicesClient";
import { getSessionUser } from "@/lib/inv-auth";
import { canInvoice } from "@/lib/inv-types";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user || !canInvoice(user.role)) redirect("/inventory"); // Yuchai staff can't invoice
  return <InvoicesClient />;
}
