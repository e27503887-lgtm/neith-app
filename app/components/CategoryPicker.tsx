"use client";

import { CATEGORIES } from "@/lib/categories";

export default function CategoryPicker({
  value,
  onChange,
  autoDetected = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  autoDetected?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-sm font-medium text-gray-700">Kategori</p>
        {autoDetected && value && (
          <span className="inline-flex items-center gap-1 text-[11px] text-accent">
            ✨ Otomatik algılandı
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const selected = value === category.value;
          return (
            <button
              key={category.value}
              type="button"
              onClick={() => onChange(selected ? null : category.value)}
              className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
