import ItemsClient from "@/components/inventory/ItemsClient";
import { getSessionUser } from "@/lib/inv-auth";
import { canPublish } from "@/lib/inv-types";

export default async function InventoryHome() {
  const user = await getSessionUser();
  return <ItemsClient canPublish={!!user && canPublish(user.role)} />;
}
