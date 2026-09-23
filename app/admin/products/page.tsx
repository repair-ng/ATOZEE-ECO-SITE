"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatNaira } from "@/lib/site-config";

interface ProductVM {
  id: string;
  name: string;
  slug: string;
  partNumber: string;
  category: string;
  price: string;
  inStock: boolean;
  isActive: boolean;
  engineNumbers?: string[];
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  function load() {
    setLoading(true);
    fetch("/api/admin/products")
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          throw new Error("unauthorized");
        }
        return res.json();
      })
      .then((data) => setProducts(data.products))
      .catch(() => null)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    setDeleteError(null);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError("Could not delete that product.");
      return;
    }
    load();
  }

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.partNumber.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        (p.engineNumbers ?? []).some((e) => e.toLowerCase().includes(query))
      );
    });
  }, [products, search, categoryFilter]);

  if (loading) return <div className="px-4 py-12 text-center">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="btn-primary">Add product</Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          className="input-field max-w-xs"
          placeholder="Search by name, part number, slug, or engine number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-auto"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {filteredProducts.length} of {products.length} product{products.length === 1 ? "" : "s"}
        </span>
      </div>

      {deleteError && <p className="mb-4 text-sm text-red-600">{deleteError}</p>}

      <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
        {filteredProducts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <span className="part-plate mt-1 inline-block">{p.partNumber}</span>
            </div>
            <span className="w-28 text-slate-500">{p.category}</span>
            <span className="w-24 text-right font-medium">{formatNaira(Number(p.price))}</span>
            <span className={`w-24 text-xs ${p.inStock ? "text-green-600" : "text-amber-600"}`}>
              {p.inStock ? "In stock" : "Made to order"}
            </span>
            <span className={`w-20 text-xs ${p.isActive ? "text-slate-600" : "text-red-600"}`}>
              {p.isActive ? "Active" : "Hidden"}
            </span>
            <div className="flex shrink-0 gap-3">
              <Link href={`/admin/products/${p.id}`} className="text-brand-blue hover:underline">
                Edit
              </Link>
              <button onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:underline">
                Delete
              </button>
            </div>
          </li>
        ))}
        {products.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No products yet — click &quot;Add product&quot; to create one.
          </li>
        )}
        {products.length > 0 && filteredProducts.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No products match your search or filter.
          </li>
        )}
      </ul>
    </div>
  );
}
