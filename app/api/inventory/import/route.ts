export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, inv } from "@/lib/inv-guard";
import { IMPORT_MAX_BYTES, ImportFileError, parseInventoryWorkbook, type ImportIssue } from "@/lib/inv-import";
import { createOrRestore } from "@/lib/inv-items";
import { checkLink } from "@/lib/inv-link";
import { round2 } from "@/lib/inv-serialize";
import { canSeePricing } from "@/lib/inv-types";

// Bulk upload is open to every staff role. Each row is saved on its own, so one bad row never blocks the rest.
export const POST = inv({ maxBytes: IMPORT_MAX_BYTES + 200_000 }, async ({ req, user }) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "No file uploaded", "NO_FILE");
  if (file.size > IMPORT_MAX_BYTES) throw new HttpError(413, "File too large (5MB max)", "TOO_LARGE");
  const updateExisting = form?.get("updateExisting") === "1";
  const pricingRole = canSeePricing(user.role);

  let parsed;
  try {
    parsed = parseInventoryWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof ImportFileError) {
      throw new HttpError(400, e.code === "TOO_MANY_ROWS" ? "Too many rows (max 1000)" : "Couldn't read that file", e.code);
    }
    throw e;
  }
  if (parsed.rows.length === 0 && parsed.issues.length === 0) throw new HttpError(400, "The file has no data rows", "BAD_FILE");

  const existing = await prisma.invItem.findMany({ where: { partNumber: { in: parsed.rows.map((r) => r.partNumber) } } });
  const byPart = new Map(existing.map((i) => [i.partNumber, i]));
  const issues: ImportIssue[] = [...parsed.issues];
  const ids = new Map<string, string>(); // part number -> item id, for the link pass
  let created = 0, updated = 0, skipped = 0, linked = 0;

  for (const r of parsed.rows) {
    const cur = byPart.get(r.partNumber);
    try {
      if (cur && !cur.isDeleted) {
        if (!updateExisting) {
          skipped++;
          issues.push({ row: r.row, partNumber: r.partNumber, code: "EXISTS" });
          continue;
        }
        // Updates only fill in what the file actually provides, and never touch quantity.
        const d: Prisma.InvItemUncheckedUpdateInput = { nameEn: r.nameEn, category: r.category };
        if (r.nameZh) d.nameZh = r.nameZh;
        if (r.description) d.description = r.description;
        if (r.unit) d.unit = r.unit;
        if (r.lowStockAt !== null) d.lowStockAt = r.lowStockAt;
        if (r.invoiceable !== null) d.invoiceable = r.invoiceable;
        if (r.costCny !== null) d.costCny = r.costCny;
        if (r.engineNumbers.length) d.engineNumbers = r.engineNumbers;
        if (pricingRole && r.priceNgn !== null) d.priceNgn = round2(r.priceNgn);
        if (pricingRole && r.marginPct !== null) d.marginPct = r.marginPct;
        await prisma.invItem.update({ where: { id: cur.id }, data: d });
        ids.set(r.partNumber, cur.id);
        updated++;
      } else {
        const item = await prisma.$transaction((tx) =>
          createOrRestore(tx, user, {
            partNumber: r.partNumber, nameEn: r.nameEn, nameZh: r.nameZh, category: r.category,
            description: r.description, unit: r.unit ?? "pcs", lowStockAt: r.lowStockAt ?? 5,
            priceNgn: pricingRole && r.priceNgn !== null ? round2(r.priceNgn) : 0,
            costCny: r.costCny, marginPct: pricingRole ? r.marginPct : null,
            invoiceable: r.invoiceable ?? true, engineNumbers: r.engineNumbers,
            linkedItemId: null, linkQty: null, // links are set in the second pass, once every item exists
          }, r.quantity, "Bulk upload")
        );
        ids.set(r.partNumber, item.id);
        created++;
      }
    } catch (e) {
      if (!(e instanceof HttpError)) console.error("[inventory import]", e);
      issues.push({ row: r.row, partNumber: r.partNumber, code: "FAILED" });
    }
  }

  // Second pass: links, now that every item in the file exists.
  for (const r of parsed.rows) {
    const selfId = ids.get(r.partNumber);
    if (!r.linkedTo || !selfId) continue;
    try {
      const target = await prisma.invItem.findFirst({ where: { partNumber: r.linkedTo, isDeleted: false }, select: { id: true } });
      if (!target) {
        issues.push({ row: r.row, partNumber: r.partNumber, code: "LINK_TARGET_MISSING", detail: r.linkedTo });
        continue;
      }
      await checkLink(prisma, selfId, target.id);
      await prisma.invItem.update({ where: { id: selfId }, data: { linkedItemId: target.id, linkQty: r.linkQty ?? 1 } });
      linked++;
    } catch (e) {
      if (e instanceof HttpError) issues.push({ row: r.row, partNumber: r.partNumber, code: e.code ?? "FAILED", detail: r.linkedTo ?? undefined });
      else throw e;
    }
  }

  const errors = issues.filter((i) => i.code !== "EXISTS");
  return NextResponse.json({
    summary: { created, updated, skipped, linked, errors: errors.length },
    issues: issues.slice(0, 200),
  });
});
