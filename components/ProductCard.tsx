import Link from "next/link";
import { formatNgn } from "@/lib/site-config";

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  partNumber: string;
  price: number;
  inStock: boolean;
  images: string[];
  engineNumbers: string[];
};

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="card"
      style={{ display: "block", overflow: "hidden", color: "inherit" }}
    >
      <div style={{ aspectRatio: "4 / 3", background: "#eee", position: "relative" }}>
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-muted)",
              fontSize: 13,
            }}
          >
            No image
          </div>
        )}
        {!product.inStock && (
          <span
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "var(--color-red)",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
            }}
          >
            Out of stock
          </span>
        )}
      </div>
      <div style={{ padding: 14 }}>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>{product.name}</h3>
        <div className="part-plate" style={{ fontSize: 12, marginBottom: 8 }}>
          {product.partNumber}
        </div>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{formatNgn(product.price)}</div>
        {product.engineNumbers.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 6 }}>
            Fits engine #: {product.engineNumbers.slice(0, 3).join(", ")}
            {product.engineNumbers.length > 3 ? "…" : ""}
          </div>
        )}
      </div>
    </Link>
  );
}
