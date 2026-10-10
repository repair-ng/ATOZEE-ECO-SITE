import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/inventory/LoginForm";
import { getSessionUser } from "@/lib/inv-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventory sign-in", robots: { index: false, follow: false } };

export default async function InventoryLogin() {
  if (await getSessionUser()) redirect("/inventory");
  const lang = cookies().get("inv_lang")?.value === "zh" ? "zh" : "en";
  return <LoginForm initialLang={lang} />;
}
