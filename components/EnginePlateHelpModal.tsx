"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function EnginePlateHelpModal({ open, onClose }: Props) {
  const [imageExists, setImageExists] = useState(true);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Where&apos;s my engine number?</h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>

        {/* /public/engine-plate-example.png to be supplied — ideally a
            photo/diagram of a Yuchai data plate with the engine number
            location circled or highlighted. */}
        {imageExists ? (
          <div className="relative mb-3 h-56 w-full overflow-hidden rounded-md bg-slate-100">
            <Image
              src="/engine-plate-example.png"
              alt="Example engine number plate"
              fill
              className="object-contain"
              onError={() => setImageExists(false)}
            />
          </div>
        ) : (
          <div className="mb-3 flex h-56 w-full items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500">
            Reference image coming soon.
          </div>
        )}

        <p className="text-sm text-slate-600">
          Your engine number is usually stamped on a metal plate on the side of the
          engine block. It's a mix of letters and numbers, similar to the example
          above — enter it exactly as shown, or just the part you can read clearly.
        </p>

        <button onClick={onClose} className="btn-primary mt-4 w-full">
          Got it
        </button>
      </div>
    </div>
  );
}
