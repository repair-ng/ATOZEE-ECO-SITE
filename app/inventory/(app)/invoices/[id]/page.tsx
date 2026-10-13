import { redirect } from "next/navigation";
import InvoiceView from "@/components/inventory/InvoiceView";
import { getSessionUser } from "@/lib/inv-auth";
import { canViewInvoices } from "@/lib/inv-types";

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !canViewInvoices(user.role)) redirect("/inventory");
  return <InvoiceView id={params.id} />;
}
