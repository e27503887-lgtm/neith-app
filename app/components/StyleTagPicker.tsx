"use client";

import { STYLE_TAGS } from "@/lib/styleTags";

export default function StyleTagPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Stil Etiketi</p>
      <div className="flex flex-wrap gap-2">
        {STYLE_TAGS.map((tag) => {
          const selected = value === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(selected ? null : tag)}
              className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
