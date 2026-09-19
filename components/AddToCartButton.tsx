"use client";

import { useState } from "react";
import { useCart, CartItem } from "@/lib/cart-context";

export function AddToCartButton({ product }: { product: Omit<CartItem, "quantity"> }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  // components/AddToCartButton.tsx
function handleAdd() {
  addItem({
    ...product,
    quantity: 1, // Pass the initial quantity required by CartItem
  });
  setAdded(true);
  setTimeout(() => setAdded(false), 1500);
}

  return (
    <button type="button" className="btn btn-primary" onClick={handleAdd} style={{ minWidth: 160 }}>
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
