"use client";

import { useState } from "react";
import { Shirt } from "lucide-react";
import OutfitCard from "./OutfitCard";
import { STYLE_TAGS } from "@/lib/styleTags";

type FeedOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
  has_tag: boolean;
};

export default function OutfitsFeed({ outfits }: { outfits: FeedOutfit[] }) {
  const [activeTag, setActiveTag] = useState<string>("all");

  const filters = ["all", ...STYLE_TAGS];
  const visible =
    activeTag === "all" ? outfits : outfits.filter((o) => o.style_tag === activeTag);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {filters.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setActiveTag(tag)}
            className={`shrink-0 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
              activeTag === tag
                ? "bg-ink text-paper border-ink"
                : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
            }`}
          >
            {tag === "all" ? "Tümü" : tag}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 gap-3">
          <Shirt size={28} strokeWidth={1} className="text-neutral-300" />
          <p className="text-gray-500 text-sm">Bu stille paylaşılmış bir kombin yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {visible.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  );
}
