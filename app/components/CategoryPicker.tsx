"use client";

import { CATEGORIES } from "@/lib/categories";

export default function CategoryPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Kategori</p>
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
