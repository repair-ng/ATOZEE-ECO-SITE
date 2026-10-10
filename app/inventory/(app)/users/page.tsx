import { redirect } from "next/navigation";
import UsersClient from "@/components/inventory/UsersClient";
import { getSessionUser } from "@/lib/inv-auth";
import { isAdmin } from "@/lib/inv-types";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.role)) redirect("/inventory");
  return <UsersClient currentUserId={user.id} />;
}
