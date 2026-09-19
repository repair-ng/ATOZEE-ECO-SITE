import { prisma } from "@/lib/db";
import { fuzzyIncludes } from "@/lib/search";
import CatalogGrid from "./CatalogGrid";

// Explicit shape for the fields we use, so filtering/type-checking here
// doesn't depend on the Prisma client's generated model types having been
// built yet (e.g. right after a fresh clone, before `prisma generate` runs).
interface ProductRow {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  category: string;
  description: string | null;
  price: number | string;
  inStock: boolean;
  images: string[];
  engineNumbers: string[];
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { engine?: string; q?: string; category?: string };
}) {
  const engine = searchParams.engine?.trim() || "";
  const q = searchParams.q?.trim() || "";
  const category = searchParams.category?.trim() || "";

  // Category narrows at the DB level (cheap, exact field). Engine number and
  // free-text search both need whitespace/case-insensitive matching that
  // Postgres array/text operators don't give us directly, so those two are
  // applied in memory below — fine at this catalog's scale; move to a
  // trigram/ILIKE-based DB search if the catalog grows much larger.
  const candidates = (await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  })) as unknown as ProductRow[];

  const filtered = candidates.filter((p: ProductRow) => {
    const matchesEngine =
      !engine || p.engineNumbers.some((n: string) => fuzzyIncludes(n, engine));

    const matchesQuery =
      !q ||
      fuzzyIncludes(p.name, q) ||
      fuzzyIncludes(p.partNumber, q) ||
      fuzzyIncludes(p.category, q) ||
      fuzzyIncludes(p.description || "", q) ||
      p.engineNumbers.some((n: string) => fuzzyIncludes(n, q));

    // Engine filter and text search are independent — both must pass, so
    // a customer can narrow by engine number and then search by name
    // within just that engine's compatible parts.
    return matchesEngine && matchesQuery;
  });

  const categories: string[] = Array.from(
    new Set(candidates.map((p: ProductRow) => p.category))
  ).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Catalog</h1>
      <CatalogGrid
        products={filtered.map((p: ProductRow) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          partNumber: p.partNumber,
          category: p.category,
          price: Number(p.price),
          inStock: p.inStock,
          images: p.images,
          engineNumbers: p.engineNumbers,
        }))}
        categories={categories}
        initialEngine={engine}
        initialQuery={q}
        initialCategory={category}
      />
    </div>
  );
}
