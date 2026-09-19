import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Add product</h1>
      <ProductForm />
    </div>
  );
}
