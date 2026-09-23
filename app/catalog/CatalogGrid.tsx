"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import EngineNumberFilter from "@/components/EngineNumberFilter";
import PartSearchFilter from "@/components/PartSearchFilter";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/site-config";

interface ProductVM {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  category: string;
  price: number;
  inStock: boolean;
  images: string[];
  engineNumbers: string[];
}

interface FiltersResponse {
  categories: string[];
  engineNumbers: string[];
  searchTerms: string[];
}

export default function CatalogGrid({
  products,
  categories,
  initialEngine,
  initialQuery,
  initialCategory,
}: {
  products: ProductVM[];
  categories: string[];
  initialEngine: string;
  initialQuery: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();

  const [engine, setEngine] = useState(initialEngine);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [suggestions, setSuggestions] = useState<FiltersResponse>({
    categories,
    engineNumbers: [],
    searchTerms: [],
  });

  // Autofill data for the datalists — fetched once; cheap for a parts
  // catalog of this size, and always reflects the current active catalog
  // regardless of which filters are applied right now.
  useEffect(() => {
    fetch("/api/catalog/filters")
      .then((res) => res.json())
      .then(setSuggestions)
      .catch(() => null);
  }, []);

  // Debounced so typing doesn't push a new URL/navigation on every
  // keystroke — filters combine via AND once the URL updates.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (engine) params.set("engine", engine); else params.delete("engine");
      if (query) params.set("q", query); else params.delete("q");
      if (category) params.set("category", category); else params.delete("category");
      router.push(`/catalog?${params.toString()}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 300);
    return () => clearTimeout(timeout);
  }, [engine, query, category]);

  return (
    <div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <EngineNumberFilter value={engine} onChange={setEngine} suggestions={suggestions.engineNumbers} />
        <PartSearchFilter value={query} onChange={setQuery} suggestions={suggestions.searchTerms} />

        <div className="flex flex-col gap-1">
          <label htmlFor="category-filter" className="text-sm font-semibold text-slate-700">
            Part category
          </label>
          <select
            id="category-filter"
            className="input-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {suggestions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-500">No parts match those filters yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-4 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 p-1.5 sm:p-4">
              <Link href={`/products/${p.slug}`} className="block">
                <div className="relative mb-1.5 h-20 w-full overflow-hidden rounded-md bg-slate-100 sm:mb-3 sm:h-40">
                  {p.images[0] && (
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 639px) 33vw, (max-width: 1023px) 25vw, 20vw"
                      className="object-contain"
                    />
                  )}
                </div>
                <h3 className="line-clamp-2 text-xs font-semibold leading-snug hover:text-brand-blue sm:text-base">
                  {p.name}
                </h3>
                <span className="part-plate mt-1 hidden sm:inline-block">{p.partNumber}</span>
                <p className="mt-2 hidden text-sm text-slate-500 sm:block">
                  Fits: {p.engineNumbers.slice(0, 3).join(", ")}
                  {p.engineNumbers.length > 3 ? "…" : ""}
                </p>
                <div className="mt-1 flex flex-col gap-0.5 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                  <span className="text-xs font-semibold text-brand-blue sm:text-base">
                    {formatNaira(p.price)}
                  </span>
                  <span className={`text-[10px] sm:text-xs ${p.inStock ? "text-green-600" : "text-amber-600"}`}>
                    {p.inStock ? "In stock" : "Made to order"}
                  </span>
                </div>
              </Link>
              {/* Deliberately a sibling of the Link above, not nested inside
                  it — clicking this shouldn't navigate to the product page,
                  and nesting a <button> inside an <a> is invalid markup. */}
              <button
                className="btn-primary mt-1.5 w-full !px-1 !py-1 !text-[11px] sm:mt-3 sm:!px-4 sm:!py-2 sm:!text-sm"
                onClick={() =>
                  addItem({
                    productId: p.id,
                    slug: p.slug,
                    name: p.name,
                    price: p.price,
                    quantity: 1,
                    inStock: p.inStock,
                    image: p.images[0],
                  })
                }
              >
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add to cart</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
