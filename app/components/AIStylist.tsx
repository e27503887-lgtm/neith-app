"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { STYLE_RULES, type StyleRule } from "@/data/styleRules";

function buildStyleTips(productName: string): string[] {
  const lower = productName.toLowerCase();
  const matched = STYLE_RULES.filter(
    (r) => lower.includes(r.tag.toLowerCase()) || lower.includes(r.pairKeyword.toLowerCase())
  );
  const pool = matched.length > 0 ? matched : STYLE_RULES;

  const picks: StyleRule[] = [];
  for (let i = 0; i < 3; i++) {
    picks.push(pool[i % pool.length]);
  }

  return picks.map(
    (r) => `${r.tag}: ${productName} parçanı ${r.pairKeyword} ile eşleştir, ${r.hint}.`
  );
}

export default function AIStylist({ productName }: { productName: string }) {
  const [open, setOpen] = useState(false);
  const [tips] = useState(() => buildStyleTips(productName));

  return (
    <div className="mt-2 border border-neutral-200 bg-paper p-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gray-600 hover:text-accent transition-colors"
      >
        <Sparkles size={14} className="text-accent" />
        Stil İpucu
      </button>

      {open && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-accent mb-2">
            Neith Stil Asistanı
          </p>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-gray-700 leading-5 flex gap-2">
                <span className="font-serif text-ink shrink-0">{i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
