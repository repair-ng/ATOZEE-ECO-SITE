import ProductForm from "@/components/ProductForm";
import ProductBulkImport from "@/components/ProductBulkImport";

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Add product</h1>

      <ProductBulkImport />

      <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        Or add one product manually
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <ProductForm />
    </div>
  );
}
