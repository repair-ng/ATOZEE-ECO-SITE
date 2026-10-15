export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inv, readJson } from "@/lib/inv-guard";
import { settingsSchema } from "@/lib/inv-schemas";
import { getPricingSettings } from "@/lib/inv-settings";

const view = (s: { rate: number; marginPct: number }) => ({ cnyToNgn: s.rate, defaultMarginPct: s.marginPct });

export const GET = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async () =>
  NextResponse.json({ settings: view(await getPricingSettings()) })
);

// Exchange rate and margin move money, so only the global admin can change them.
export const PUT = inv({ roles: ["GLOBAL_ADMIN"] }, async ({ req, user }) => {
  const b = await readJson(req, settingsSchema);
  await prisma.invSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", cnyToNgn: b.cnyToNgn, defaultMarginPct: b.defaultMarginPct, updatedByName: user.displayName },
    update: { cnyToNgn: b.cnyToNgn, defaultMarginPct: b.defaultMarginPct, updatedByName: user.displayName },
  });
  // Prices that come from cost x rate x margin just changed: mark those items "changed since publish".
  await prisma.invItem.updateMany({ where: { costCny: { not: null }, isDeleted: false }, data: { updatedAt: new Date() } });
  return NextResponse.json({ settings: view(await getPricingSettings()) });
});
