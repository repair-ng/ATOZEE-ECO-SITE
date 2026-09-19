import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ProductFilterRow {
  name: string;
  partNumber: string;
  category: string;
  engineNumbers: string[];
}

// Powers the catalog's autofill dropdowns (engine number + free-text search)
// and the category filter. Read-only, no auth needed — it's just a distinct
// list of values already visible in the public catalog.
export async function GET() {
  const products = (await prisma.product.findMany({
    where: { isActive: true },
    select: { name: true, partNumber: true, category: true, engineNumbers: true },
  })) as unknown as ProductFilterRow[];

  const categories: string[] = Array.from(
    new Set(products.map((p: ProductFilterRow) => p.category))
  ).sort();
  const engineNumbers: string[] = Array.from(
    new Set(products.flatMap((p: ProductFilterRow) => p.engineNumbers))
  ).sort();
  const searchTerms: string[] = Array.from(
    new Set(products.flatMap((p: ProductFilterRow) => [p.name, p.partNumber]))
  ).sort();

  return NextResponse.json({ categories, engineNumbers, searchTerms });
}

