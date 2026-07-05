"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronRight } from "lucide-react";

type FashionTerm = {
  id: string;
  term: string;
  description: string;
  outfits: { title: string; image_url: string }[];
};

const TERMS: FashionTerm[] = [
  {
    id: "blokecore",
    term: "Blokecore",
    description:
      "İngiliz futbol kültüründen ilham alan, vintage forma, salaş jean ve spor ayakkabılarla kurulan rahat ama şık bir sokak stili.",
    outfits: [
      {
        title: "Retro forma + baggy jean",
        image_url:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80&auto=format&fit=crop",
      },
      {
        title: "Track top + kargo pantolon",
        image_url:
          "https://images.unsplash.com/photo-1520975911998-5ae3a1c1b9a1?w=200&q=80&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "vintage-kargo",
    term: "Vintage Kargo",
    description:
      "2000'lerin çok cepli kargo pantolonlarını günümüz minimalist üst parçalarıyla harmanlayan nostaljik bir akım.",
    outfits: [
      {
        title: "Kargo pantolon + crop tişört",
        image_url:
          "https://images.unsplash.com/photo-1488722796624-0aa6f1bb6399?w=200&q=80&auto=format&fit=crop",
      },
      {
        title: "Kargo şort + oversize gömlek",
        image_url:
          "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "oversize",
    term: "Oversize",
    description:
      "Bol kesim üst ve alt parçalarla rahatlığı ön planda tutan, silueti bilinçli olarak büyüten modern bir tavır.",
    outfits: [
      {
        title: "Oversize blazer + dar pantolon",
        image_url:
          "https://images.unsplash.com/photo-1520975911998-5ae3a1c1b9a1?w=200&q=80&auto=format&fit=crop",
      },
      {
        title: "Oversize hoodie + tayt",
        image_url:
          "https://images.unsplash.com/photo-1488722796624-0aa6f1bb6399?w=200&q=80&auto=format&fit=crop",
      },
    ],
  },
];

export default function FashionEncyclopedia() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = TERMS.find((t) => t.id === activeId) ?? null;

  return (
    <>
      <div className="bg-paper border border-neutral-200 p-4">
        <h3 className="font-serif italic text-xl text-ink mb-1">Moda Sözlüğü</h3>
        <p className="section-label mb-4">Moda Terimleri</p>

        <div className="flex flex-col divide-y divide-neutral-200">
          {TERMS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className="flex items-center justify-between py-3 text-left group"
            >
              <span className="font-serif text-lg text-ink group-hover:text-accent transition-colors">
                {t.term}
              </span>
              <ChevronRight
                size={16}
                className="text-gray-400 group-hover:text-accent transition-colors shrink-0"
              />
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setActiveId(null)}
        >
          <div
            className="bg-paper max-w-md w-full max-h-[80vh] overflow-y-auto border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-neutral-200">
              <div>
                <p className="section-label mb-1">Moda Sözlüğü</p>
                <h3 className="font-serif italic text-3xl text-ink">{active.term}</h3>
              </div>
              <button
                onClick={() => setActiveId(null)}
                className="text-gray-400 hover:text-ink transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm text-gray-600 leading-6">{active.description}</p>

              <p className="section-label mt-6 mb-3">Popüler Kombinler</p>
              <div className="flex flex-col gap-3">
                {active.outfits.map((o, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative w-14 h-14 shrink-0 overflow-hidden bg-neutral-50">
                      <Image src={o.image_url} alt={o.title} fill className="object-cover" />
                    </div>
                    <span className="text-sm text-ink">{o.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
