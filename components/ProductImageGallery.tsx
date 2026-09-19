"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
        No image available
      </div>
    );
  }

  function goTo(index: number) {
    const wrapped = (index + images.length) % images.length;
    setActiveIndex(wrapped);
  }

  return (
    <div
      // Lets the gallery take arrow-key input once clicked/focused, without
      // requiring a mouse for prev/next.
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") goTo(activeIndex - 1);
        if (e.key === "ArrowRight") goTo(activeIndex + 1);
      }}
      className="outline-none"
    >
      <div className="relative mb-3 h-72 w-full overflow-hidden rounded-lg bg-slate-100">
        <Image
          src={images[activeIndex]}
          alt={`${productName} — image ${activeIndex + 1} of ${images.length}`}
          fill
          className="object-contain"
          priority
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white"
            >
              ›
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${
                i === activeIndex ? "border-brand-blue" : "border-transparent"
              }`}
            >
              <Image src={url} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
