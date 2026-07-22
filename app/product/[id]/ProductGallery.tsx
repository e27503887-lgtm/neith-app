"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";

export type GalleryTag = {
  id: number | string;
  x_percent: number;
  y_percent: number;
  product_id: number | string;
  title: string;
  price: number;
  image_url: string;
};

type MediaItem = {
  media_url: string;
  media_type: "image" | "video";
  tags?: GalleryTag[];
};

export default function ProductGallery({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [tagsVisible, setTagsVisible] = useState(false);
  const [openTagId, setOpenTagId] = useState<number | string | null>(null);

  const active = media[activeIndex] ?? media[0];
  const activeTags = active.tags ?? [];
  const hasTags = activeTags.length > 0;

  function selectIndex(index: number) {
    setActiveIndex(index);
    setTagsVisible(false);
    setOpenTagId(null);
  }

  function toggleTagsVisible() {
    setTagsVisible((visible) => !visible);
    setOpenTagId(null);
  }

  return (
    <div className="w-full md:w-1/2 flex flex-col gap-2">
      <div className="relative w-full aspect-square">
        <div className="absolute inset-0 overflow-hidden bg-gray-100">
          {active.media_type === "video" ? (
            <video
              src={active.media_url}
              controls
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={active.media_url}
              alt={title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          )}
        </div>

        {hasTags && (
          <div className="absolute inset-0" onClick={toggleTagsVisible}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTagsVisible();
              }}
              aria-label="Parçaları Gör"
              className="absolute bottom-2 right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 text-ink shadow-sm"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
            </button>

            {tagsVisible &&
              activeTags.map((tag) => (
                <div
                  key={tag.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-fade-in"
                  style={{ left: `${tag.x_percent}%`, top: `${tag.y_percent}%` }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenTagId((id) => (id === tag.id ? null : tag.id));
                    }}
                    aria-label={tag.title}
                    className="relative flex h-7 w-7 items-center justify-center"
                  >
                    <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                    <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md">
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                  </button>

                  {openTagId === tag.id && (
                    <Link
                      href={`/product/${tag.product_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`group/tagcard absolute left-1/2 z-20 flex w-48 -translate-x-1/2 items-center gap-2 border border-neutral-200 bg-surface p-2 shadow-lg transition-colors hover:border-accent ${
                        tag.y_percent > 60 ? "bottom-full mb-2" : "top-full mt-2"
                      }`}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden bg-neutral-100">
                        <Image src={tag.image_url} alt={tag.title} fill sizes="44px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-ink">{tag.title}</span>
                        <span className="block text-xs text-gray-500">{tag.price.toLocaleString("tr-TR")} ₺</span>
                        <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-gray-500 transition-colors group-hover/tagcard:text-accent">
                          İlana Git →
                        </span>
                      </span>
                    </Link>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {media.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => selectIndex(index)}
              className={`relative shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors ${
                index === activeIndex ? "border-accent" : "border-transparent"
              }`}
            >
              {item.media_type === "video" ? (
                <video src={item.media_url} className="w-full h-full object-cover" muted />
              ) : (
                <Image
                  src={item.media_url}
                  alt={`${title} ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
