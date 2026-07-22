"use client";

import { FABRIC_OPTIONS, type Fabric } from "@/lib/fabric";

export default function FabricPicker({
  value,
  onChange,
}: {
  value: Fabric | null;
  onChange: (value: Fabric | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Kumaş</p>
      <div className="flex flex-wrap gap-2">
        {FABRIC_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(selected ? null : option.value)}
              className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-primary text-dark border-primary"
                  : "border-neutral-300 text-gray-600 hover:border-primary hover:text-ink"
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
