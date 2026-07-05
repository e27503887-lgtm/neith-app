"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { STYLE_RULES } from "@/data/styleRules";

type OwnProduct = {
  id: number | string;
  title: string;
  image_url: string;
};

type PlanDay = {
  day: string;
  tag: string;
  note: string;
};

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

function buildCapsulePlan(products: OwnProduct[], offset: number): PlanDay[] {
  return DAYS.map((day, i) => {
    const rule = STYLE_RULES[(i + offset) % STYLE_RULES.length];
    const matched = products.find((p) =>
      p.title.toLowerCase().includes(rule.pairKeyword.toLowerCase())
    );
    const chosen = matched ?? products[(i + offset) % products.length];

    return {
      day,
      tag: rule.tag,
      note: `${chosen.title} ile ${rule.hint}.`,
    };
  });
}

export default function CapsulePlanner({ products }: { products: OwnProduct[] }) {
  const [plan, setPlan] = useState<PlanDay[] | null>(null);
  const [offset, setOffset] = useState(0);

  const canGenerate = products.length >= 2;

  function handleGenerate() {
    if (!canGenerate) return;
    setPlan(buildCapsulePlan(products, offset));
  }

  function handleRegenerate() {
    const nextOffset = offset + 1;
    setOffset(nextOffset);
    setPlan(buildCapsulePlan(products, nextOffset));
  }

  return (
    <section className="border border-neutral-200 bg-paper p-6 md:p-8">
      <p className="section-label mb-2">Kapsül Dolap</p>
      <h2 className="font-serif italic text-3xl text-ink mb-4">5 Günlük Kombin Takvimi</h2>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">
          Henüz bir ürün ilanın yok. Takvim oluşturmak için önce birkaç parça ekle.
        </p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
            {products.map((p) => (
              <div key={p.id} className="relative w-14 h-14 shrink-0 overflow-hidden bg-neutral-50">
                <Image src={p.image_url} alt={p.title} fill className="object-cover" />
              </div>
            ))}
          </div>

          {!canGenerate && (
            <p className="text-xs text-gray-400 mb-4">
              Takvim oluşturmak için en az 2 ürün ilanın olmalı.
            </p>
          )}

          {!plan && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn-primary disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} /> Takvimi Oluştur
              </span>
            </button>
          )}

          {plan && (
            <div>
              <div className="divide-y divide-neutral-200 border-t border-neutral-200">
                {plan.map((d) => (
                  <div key={d.day} className="flex items-baseline gap-5 py-4">
                    <span className="font-serif text-2xl text-ink w-28 shrink-0">{d.day}</span>
                    <div className="flex-1">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-accent mb-1">
                        {d.tag}
                      </p>
                      <p className="text-sm text-gray-600 leading-6">{d.note}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleRegenerate}
                className="text-xs text-gray-500 hover:text-accent transition-colors mt-4"
              >
                Yeniden Oluştur
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
