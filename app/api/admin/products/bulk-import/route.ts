export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  classifyProductImportRows,
  parseProductImportFile,
  type ImportRowIssue,
} from "@/lib/product-import";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB — plenty for a product spreadsheet

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "That file is too large (10MB max)." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = parseProductImportFile(buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not read that file. Make sure it's a valid .xlsx, .xls, or .csv export." },
      { status: 400 }
    );
  }

  if (parsed.valid.length === 0 && parsed.errors.length === 0) {
    return NextResponse.json({ error: "The file has no data rows to import." }, { status: 400 });
  }

  const existingProducts = await prisma.product.findMany();
  const { toCreate, skipped, conflicts } = classifyProductImportRows(parsed.valid, existingProducts);

  const created: { row: number; name: string; id: string }[] = [];
  const createErrors: ImportRowIssue[] = [];

  for (const item of toCreate) {
    try {
      const product = await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          partNumber: item.partNumber,
          category: item.category,
          description: item.description,
          price: item.price,
          inStock: item.inStock,
          isActive: item.isActive,
          images: item.images,
          engineNumbers: item.engineNumbers,
        },
      });
      created.push({ row: item.row, name: product.name, id: product.id });
    } catch {
      createErrors.push({
        row: item.row,
        name: item.name,
        message: "Could not save this row — it may conflict with another row imported just now.",
      });
    }
  }

  const errors = [...parsed.errors, ...createErrors];

  return NextResponse.json({
    summary: {
      totalRows: parsed.valid.length + parsed.errors.length,
      created: created.length,
      skippedDuplicates: skipped.length,
      conflicts: conflicts.length,
      rowErrors: errors.length,
    },
    created,
    skipped,
    conflicts,
    errors,
  });
}
