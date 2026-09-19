import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/site-config";
import AddToCartButton from "./AddToCartButton";
import ProductImageGallery from "@/components/ProductImageGallery";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({ where: { slug: params.slug } });
  if (!product || !product.isActive) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductImageGallery images={product.images} productName={product.name} />

        <div>
          <h1 className="mb-2 text-2xl font-bold">{product.name}</h1>
          <span className="part-plate mb-3 inline-block">{product.partNumber}</span>
          <p className="mb-4 text-slate-600">{product.description}</p>

          <p className="mb-1 text-sm font-semibold text-slate-700">Fits engine numbers:</p>
          <ul className="mb-4 flex flex-wrap gap-2">
            {product.engineNumbers.map((n) => (
              <li key={n} className="part-plate">{n}</li>
            ))}
          </ul>

          <p className="mb-4 text-2xl font-bold text-brand-blue">
            {formatNaira(Number(product.price))}
          </p>
          <p className={`mb-4 text-sm ${product.inStock ? "text-green-600" : "text-amber-600"}`}>
            {product.inStock ? "In stock" : "Made to order — may go through as a quote request"}
          </p>

          <AddToCartButton
            productId={product.id}
            slug={product.slug}
            name={product.name}
            price={Number(product.price)}
            inStock={product.inStock}
            image={product.images[0]}
          />
        </div>
      </div>
    </div>
  );
}
