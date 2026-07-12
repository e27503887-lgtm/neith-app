"use client";

// Profil düzenlemedeki vücut tipi seçici — opsiyonel, tek seçimli chip
// listesi + her chipte nötr bir açıklama tooltip'i (i). "Belirtmek
// istemiyorum" seçimi değeri açıkça null'a çeker. Bu bilgi asla profilde
// veya başka kullanıcılara gösterilmez; yalnızca kombin motorunun kendi
// önerilerini kişiselleştirmesi için kullanılır (bkz. lib/outfit-engine.ts).

import { Info } from "lucide-react";
import { BODY_TYPE_OPTIONS, type BodyType } from "@/lib/bodyType";

export default function BodyTypePicker({
  value,
  onChange,
}: {
  value: BodyType | null;
  onChange: (value: BodyType | null) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">Vücut Tipi</p>
      <p className="text-xs text-gray-500 mb-2">
        Bu bilgi asla profilinde görünmez, yalnızca sana özel kombin önerilerini iyileştirmek
        için kullanılır.
      </p>
      <div className="flex flex-wrap gap-2">
        {BODY_TYPE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <span
              key={option.value}
              className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              <button
                type="button"
                onClick={() => onChange(selected ? null : option.value)}
              >
                {option.label}
              </button>
              <span title={option.description} aria-label={option.description}>
                <Info size={12} strokeWidth={1.5} className="opacity-70" />
              </span>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
            value === null
              ? "border-ink text-ink"
              : "border-neutral-300 text-gray-500 hover:border-ink hover:text-ink"
          }`}
        >
          Belirtmek istemiyorum
        </button>
      </div>
    </div>
  );
}
