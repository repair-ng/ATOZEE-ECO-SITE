"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ProductCard, ProductSummary } from "./ProductCard";
import { EngineNumberFilter } from "./EngineNumberFilter";

export function CatalogBrowser({
  products,
  categories,
  initialEngine,
  initialCategory,
}: {
  products: ProductSummary[];
  categories: string[];
  initialEngine: string;
  initialCategory: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [engine, setEngine] = useState(initialEngine);
  const [category, setCategory] = useState(initialCategory);

  // Debounce updating the URL (and therefore re-querying the server) while typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (engine) params.set("engine", engine);
      else params.delete("engine");
      if (category) params.set("category", category);
      else params.delete("category");

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, category]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-end",
          marginBottom: 24,
          padding: 16,
        }}
        className="card"
      >
        <div style={{ minWidth: 260 }}>
          <EngineNumberFilter value={engine} onChange={setEngine} />
        </div>
        <div className="field" style={{ marginBottom: 0, minWidth: 200 }}>
          <label htmlFor="category-filter">Category</label>
          <select id="category-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {products.length === 0 ? (
        <p style={{ color: "var(--color-muted)" }}>
          No parts matched that engine number. Double-check the number against your engine's
          data plate, or contact us and we'll help track down the right part.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
