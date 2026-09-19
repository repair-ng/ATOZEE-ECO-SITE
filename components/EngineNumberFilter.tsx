"use client";

import { useState } from "react";
import EnginePlateHelpModal from "./EnginePlateHelpModal";

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

export default function EngineNumberFilter({ value, onChange, suggestions = [] }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="engine-number" className="text-sm font-semibold text-slate-700">
        Filter by engine number
      </label>
      <div className="flex items-center gap-2">
        <input
          id="engine-number"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. YC6108ZLQ-123456"
          className="input-field"
          list="engine-number-suggestions"
          autoComplete="off"
        />
        <button
          type="button"
          aria-label="How do I find my engine number?"
          onClick={() => setHelpOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
        >
          ?
        </button>
      </div>
      {/* Native browser autofill dropdown — lightweight, no extra JS needed
          for the suggestion UI itself. */}
      <datalist id="engine-number-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="text-xs text-slate-500">
        Enter all or part of your engine number — spaces and extra characters don&apos;t matter,
        and you can combine this with a name search below.
      </p>

      <EnginePlateHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
