"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  suggestions?: string[];
}

export default function PartSearchFilter({ value, onChange, suggestions = [] }: Props) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="part-search" className="text-sm font-semibold text-slate-700">
        Search by name or part number
      </label>
      <input
        id="part-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. water pump"
        className="input-field"
        list="part-search-suggestions"
        autoComplete="off"
      />
      <datalist id="part-search-suggestions">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
