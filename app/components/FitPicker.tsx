"use client";

import { FIT_OPTIONS, type Fit } from "@/lib/outfit-engine";

export default function FitPicker({
  value,
  onChange,
}: {
  value: Fit | null;
  onChange: (value: Fit | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Kesim</p>
      <div className="flex flex-wrap gap-2">
        {FIT_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(selected ? null : option.value)}
              className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
