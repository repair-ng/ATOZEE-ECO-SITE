import { prisma } from "@/lib/db";
import type { PricingSettings } from "@/lib/inv-pricing";

export async function getPricingSettings(): Promise<PricingSettings> {
  const r = await prisma.invSettings.findUnique({ where: { id: "singleton" } });
  return { rate: r ? Number(r.cnyToNgn) : 0, marginPct: r ? Number(r.defaultMarginPct) : 0 };
}
