"use client";

import { useCart } from "@/lib/cart-context";

interface Props {
  productId: string;
  slug: string;
  name: string;
  price: number;
  inStock: boolean;
  image?: string;
}

export default function AddToCartButton(props: Props) {
  const { addItem } = useCart();
  return (
    <button
      className="btn-primary"
      onClick={() =>
        addItem({
          productId: props.productId,
          slug: props.slug,
          name: props.name,
          price: props.price,
          quantity: 1,
          inStock: props.inStock,
          image: props.image,
        })
      }
    >
      Add to cart
    </button>
  );
}
