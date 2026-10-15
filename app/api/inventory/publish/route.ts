export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { inv, readJson } from "@/lib/inv-guard";
import { runPublish } from "@/lib/inv-publish";
import { publishSchema } from "@/lib/inv-schemas";
import { ITEM_INCLUDE } from "@/lib/inv-serialize";
import { getPricingSettings } from "@/lib/inv-settings";
import { itemWhere } from "@/lib/inv-where";

const MAX = 500; // per request — keeps one click from turning into a runaway job

export const POST = inv({ roles: ["ATOZEE_STAFF", "GLOBAL_ADMIN"] }, async ({ req }) => {
  const b = await readJson(req, publishSchema);

  const items = await prisma.invItem.findMany({
    where: b.itemIds?.length ? { id: { in: b.itemIds }, isDeleted: false } : itemWhere(b.filter ?? {}),
    include: ITEM_INCLUDE,
    orderBy: [{ category: "asc" }, { nameEn: "asc" }],
    take: MAX + 1,
  });
  const truncated = items.length > MAX;

  const result = await runPublish(items.slice(0, MAX), await getPricingSettings(), { updateExisting: b.updateExisting, dryRun: b.dryRun });
  return NextResponse.json({ ...result, truncated });
});
