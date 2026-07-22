"use client";

import { ERAS } from "@/lib/eras";

export default function EraPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Dönem</p>
      <div className="flex flex-wrap gap-2">
        {ERAS.map((era) => {
          const selected = value === era.value;
          return (
            <button
              key={era.value}
              type="button"
              onClick={() => onChange(selected ? null : era.value)}
              className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-primary text-dark border-primary"
                  : "border-neutral-300 text-gray-600 hover:border-primary hover:text-ink"
              }`}
            >
              {era.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
