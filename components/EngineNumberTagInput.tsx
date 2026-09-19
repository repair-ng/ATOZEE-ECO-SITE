"use client";

import { useState } from "react";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
}

export default function EngineNumberTagInput({ values, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(values.filter((v) => v !== tag));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Fits engine numbers</label>
      <div className="mb-2 flex flex-wrap gap-2">
        {values.map((v) => (
          <span key={v} className="part-plate flex items-center gap-1">
            {v}
            <button
              type="button"
              onClick={() => removeTag(v)}
              aria-label={`Remove ${v}`}
              className="text-slate-500 hover:text-red-600"
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input-field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Type an engine number, then press Enter"
        />
        <button type="button" onClick={addTag} className="btn-secondary shrink-0">
          Add
        </button>
      </div>
    </div>
  );
}
