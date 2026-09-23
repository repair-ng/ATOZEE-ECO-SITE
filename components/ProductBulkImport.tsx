"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ImportIssue {
  row: number;
  name: string;
  message: string;
}
interface ImportSkipped {
  row: number;
  name: string;
  reason: string;
}
interface ImportCreated {
  row: number;
  name: string;
  id: string;
}
interface ImportResult {
  summary: {
    totalRows: number;
    created: number;
    skippedDuplicates: number;
    conflicts: number;
    rowErrors: number;
  };
  created: ImportCreated[];
  skipped: ImportSkipped[];
  conflicts: ImportIssue[];
  errors: ImportIssue[];
}

export default function ProductBulkImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/products/bulk-import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not import that file.");
        return;
      }
      setResult(data);
      if (data.summary.created > 0) {
        router.refresh();
      }
    } catch {
      setError("Something went wrong reading that file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Bulk upload from Excel</h2>
        <a href="/api/admin/products/template" className="text-sm text-brand-blue hover:underline">
          Download template
        </a>
      </div>
      <p className="mb-3 text-sm text-slate-600">
        Fill in the template with your products and upload it below. Rows that already exist in the
        catalog with identical details are skipped automatically. Images aren&apos;t part of bulk
        upload — add them to each product afterwards from its Edit page (or paste already-hosted
        image URLs into the template&apos;s Image URLs column).
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        onChange={handleFile}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="mt-2 text-xs text-slate-500">Importing…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <ul className="flex flex-wrap gap-2 text-xs">
            <li className="rounded bg-green-50 px-2 py-1 text-green-700">{result.summary.created} created</li>
            <li className="rounded bg-slate-100 px-2 py-1 text-slate-600">
              {result.summary.skippedDuplicates} skipped (already exist)
            </li>
            <li className="rounded bg-amber-50 px-2 py-1 text-amber-700">
              {result.summary.conflicts} conflicts
            </li>
            <li className="rounded bg-red-50 px-2 py-1 text-red-700">{result.summary.rowErrors} row errors</li>
          </ul>

          {result.conflicts.length > 0 && (
            <div>
              <p className="font-medium text-amber-700">Conflicts (not imported)</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                {result.conflicts.map((c) => (
                  <li key={`c-${c.row}`}>
                    Row {c.row} ({c.name}): {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <p className="font-medium text-red-700">Row errors</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                {result.errors.map((e) => (
                  <li key={`e-${e.row}`}>
                    Row {e.row} ({e.name}): {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.skipped.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium text-slate-600">
                Skipped duplicates ({result.skipped.length})
              </summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-500">
                {result.skipped.map((s) => (
                  <li key={`s-${s.row}`}>
                    Row {s.row} ({s.name}): {s.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {result.created.length > 0 && (
            <details open>
              <summary className="cursor-pointer font-medium text-green-700">
                Created ({result.created.length})
              </summary>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-500">
                {result.created.map((c) => (
                  <li key={c.id}>
                    Row {c.row}: {c.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
