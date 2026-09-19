"use client";

import { useRef, useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ProductImageUploader({ images, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      // 1. Ask our server for a presigned MinIO upload URL — staff-only,
      //    so the actual bucket credentials never reach the browser.
      const presignRes = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        setError(presignData.error || "Could not prepare upload.");
        return;
      }

      // 2. Upload the file bytes directly to MinIO — never touches our
      //    own server, so large images don't eat our app's bandwidth.
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        setError("Upload to storage failed. Check MinIO is running and reachable.");
        return;
      }

      onChange([...images, presignData.publicUrl]);
    } catch {
      setError("Something went wrong uploading that image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(url: string) {
    onChange(images.filter((i) => i !== url));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Images</label>

      {images.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md border border-slate-200">
              <Image src={url} alt="Product" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Remove image"
                className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && <p className="mt-1 text-xs text-slate-500">Uploading…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
