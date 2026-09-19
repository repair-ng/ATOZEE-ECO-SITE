"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductImageUploader from "@/components/ProductImageUploader";
import EngineNumberTagInput from "@/components/EngineNumberTagInput";

export interface ProductFormValues {
  name: string;
  slug: string;
  partNumber: string;
  category: string;
  description: string;
  price: string;
  inStock: boolean;
  isActive: boolean;
  images: string[];
  engineNumbers: string[];
}

export const emptyProductForm: ProductFormValues = {
  name: "",
  slug: "",
  partNumber: "",
  category: "",
  description: "",
  price: "",
  inStock: true,
  isActive: true,
  images: [],
  engineNumbers: [],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface Props {
  initial?: ProductFormValues;
  productId?: string; // present when editing
}

export default function ProductForm({ initial, productId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(initial || emptyProductForm);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    update("name", value);
    if (!slugTouched) {
      update("slug", slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.slug.trim() || !form.partNumber.trim() || !form.category.trim()) {
      setError("Name, slug, part number, and category are all required.");
      return;
    }
    if (!form.price || isNaN(Number(form.price))) {
      setError("A valid price is required.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price) };
      const res = await fetch(
        productId ? `/api/admin/products/${productId}` : "/api/admin/products",
        {
          method: productId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => handleNameChange(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Slug (used in the URL)</label>
        <input
          className="input-field"
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update("slug", slugify(e.target.value));
          }}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          /products/{form.slug || "your-slug"} — lowercase letters, numbers, and hyphens only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Part number</label>
          <input
            className="input-field"
            value={form.partNumber}
            onChange={(e) => update("partNumber", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Category</label>
          <input
            className="input-field"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            placeholder="e.g. Gaskets, Cooling, Fuel System"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          className="input-field"
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Price (NGN)</label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            required
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.inStock}
              onChange={(e) => update("inStock", e.target.checked)}
            />
            In stock
          </label>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            Active (visible in catalog)
          </label>
        </div>
      </div>

      <EngineNumberTagInput
        values={form.engineNumbers}
        onChange={(v) => update("engineNumbers", v)}
      />

      <ProductImageUploader images={form.images} onChange={(v) => update("images", v)} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : productId ? "Save changes" : "Create product"}
        </button>
        <button type="button" onClick={() => router.push("/admin/products")} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
