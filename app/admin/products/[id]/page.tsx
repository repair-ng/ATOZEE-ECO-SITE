"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProductForm, { ProductFormValues } from "@/components/ProductForm";

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [initial, setInitial] = useState<ProductFormValues | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/products/${params.id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/admin/login");
          throw new Error("unauthorized");
        }
        if (res.status === 404) {
          setNotFound(true);
          throw new Error("not found");
        }
        return res.json();
      })
      .then((data) => {
        const p = data.product;
        setInitial({
          name: p.name,
          slug: p.slug,
          partNumber: p.partNumber,
          category: p.category,
          description: p.description || "",
          price: String(p.price),
          inStock: p.inStock,
          isActive: p.isActive,
          images: p.images,
          engineNumbers: p.engineNumbers,
        });
      })
      .catch(() => null);
  }, [params.id, router]);

  if (notFound) {
    return <div className="px-4 py-12 text-center text-sm text-slate-500">Product not found.</div>;
  }
  if (!initial) {
    return <div className="px-4 py-12 text-center">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Edit product</h1>
      <ProductForm initial={initial} productId={params.id} />
    </div>
  );
}
