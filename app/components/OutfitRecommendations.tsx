"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import BrandBadge from "./BrandBadge";
import OutfitLikeButton from "./OutfitLikeButton";

type RecommendedOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

type Props = {
  featured: RecommendedOutfit[];
  community: RecommendedOutfit[];
  brand: RecommendedOutfit[];
};

const TABS = [
  { value: "featured", label: "Neith Seçkisi" },
  { value: "community", label: "Topluluktan" },
  { value: "brand", label: "Markalardan" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function OutfitRecommendations({ featured, community, brand }: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>("featured");

  const listByTab: Record<TabValue, RecommendedOutfit[]> = {
    featured,
    community,
    brand,
  };

  const activeList = listByTab[activeTab];

  return (
    <section id="recommendations" className="mb-10">
      <h3 className="section-label mb-3">Kombin Önerileri</h3>

      <div className="flex gap-6 border-b border-neutral-200 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.value
                ? "border-accent text-ink"
                : "border-transparent text-gray-500 hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeList.length === 0 ? (
        <p className="text-gray-500 text-sm">Bu bölümde henüz kombin yok.</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
          {activeList.map((outfit, idx) => (
            <Link
              key={outfit.id}
              href={`/outfit/${outfit.id}`}
              className="relative shrink-0 w-[78vw] sm:w-48 md:w-56 snap-start bg-paper border border-neutral-200 overflow-hidden hover:border-neutral-400 transition-colors"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden">
                {activeTab === "featured" && idx < 3 && (
                  <div className="absolute -top-3 -left-3 bg-paper border border-neutral-200 px-3 py-2 font-serif text-xl z-10">
                    {idx + 1}
                  </div>
                )}
                {activeTab === "featured" && (
                  <span className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-paper/90 text-accent text-[11px] font-medium px-2 py-1">
                    <Star size={12} className="fill-accent text-accent" />
                    Seçki
                  </span>
                )}
                <Image
                  src={outfit.image_url}
                  alt={outfit.title}
                  fill
                  sizes="160px"
                  className="object-cover transition-transform duration-500 ease-out hover:scale-105"
                />
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{outfit.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {outfit.avatar_url ? (
                      <Image
                        src={outfit.avatar_url}
                        alt={outfit.username}
                        width={16}
                        height={16}
                        className="w-4 h-4 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-semibold text-gray-600 shrink-0">
                        {outfit.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="flex items-center gap-0.5 text-[11px] text-gray-500 truncate">
                      @{outfit.username}
                      {outfit.account_type === "brand" && <BrandBadge />}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <OutfitLikeButton outfitId={outfit.id} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
