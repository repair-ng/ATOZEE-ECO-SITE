import { redirect } from "next/navigation";
import SettingsClient from "@/components/inventory/SettingsClient";
import { getSessionUser } from "@/lib/inv-auth";
import { isAdmin } from "@/lib/inv-types";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.role)) redirect("/inventory");
  return <SettingsClient />;
}
