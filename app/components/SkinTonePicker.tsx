"use client";

// Profil düzenlemedeki cilt alt tonu seçici — en hassas kişisel katman.
// Opsiyonel, tek seçimli chip listesi + (i) açıklama tooltip'i + emin
// olmayanlar için tıklanınca açılan kısa bir ipucu kutusu. "Belirtmek
// istemiyorum" değeri açıkça null'a çeker. Bu bilgi asla profilde veya
// başka kullanıcılara gösterilmez; yalnızca kombin motorunun kendi renk
// önerilerini kişiselleştirmesi için kullanılır (bkz. lib/outfit-engine.ts).

import { useState } from "react";
import { Info, HelpCircle } from "lucide-react";
import { SKIN_UNDERTONE_OPTIONS, SKIN_UNDERTONE_HELP, type SkinUndertone } from "@/lib/skinTone";

export default function SkinTonePicker({
  value,
  onChange,
}: {
  value: SkinUndertone | null;
  onChange: (value: SkinUndertone | null) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">Cilt Alt Tonu</p>
      <p className="text-xs text-gray-500 mb-2">
        Bu bilgi asla görünmez, yalnızca sana özel renk önerilerini iyileştirir.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {SKIN_UNDERTONE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <span
              key={option.value}
              className={`inline-flex items-center gap-1 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-primary text-dark border-primary"
                  : "border-neutral-300 text-gray-600 hover:border-primary hover:text-ink"
              }`}
            >
              <button type="button" onClick={() => onChange(selected ? null : option.value)}>
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
              ? "border-primary text-ink"
              : "border-neutral-300 text-gray-500 hover:border-primary hover:text-ink"
          }`}
        >
          Belirtmek istemiyorum
        </button>
      </div>

      <button
        type="button"
        onClick={() => setHelpOpen((open) => !open)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-accent transition-colors"
      >
        <HelpCircle size={12} strokeWidth={1.5} />
        Emin değil misin?
      </button>
      {helpOpen && (
        <p className="mt-1.5 text-xs text-gray-500 leading-5 max-w-md">{SKIN_UNDERTONE_HELP}</p>
      )}
    </div>
  );
}
