"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Pin } from "lucide-react";
import { supabase } from "../utils/supabase";

type WardrobeOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  like_count: number;
  is_highlighted: boolean;
};

export default function WardrobeGrid({
  profileId,
  outfits,
}: {
  profileId: string;
  outfits: WardrobeOutfit[];
}) {
  const [items, setItems] = useState(outfits);
  const [isOwner, setIsOwner] = useState(false);
  const [pinningId, setPinningId] = useState<string | number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === profileId);
    });
  }, [profileId]);

  async function togglePin(outfit: WardrobeOutfit) {
    if (pinningId) return;
    const nextValue = !outfit.is_highlighted;

    setPinningId(outfit.id);
    setItems((prev) =>
      prev.map((o) => (o.id === outfit.id ? { ...o, is_highlighted: nextValue } : o))
    );

    const { error } = await supabase
      .from("outfits")
      .update({ is_highlighted: nextValue })
      .eq("id", outfit.id);

    if (error) {
      setItems((prev) =>
        prev.map((o) => (o.id === outfit.id ? { ...o, is_highlighted: !nextValue } : o))
      );
    }
    setPinningId(null);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-gray-500 text-sm">Henüz kombin paylaşılmamış.</p>
        {isOwner && (
          <Link href="/outfit/new" className="btn-primary">
            Yeni Kombin Paylaş
          </Link>
        )}
      </div>
    );
  }

  const highlighted = items.filter((o) => o.is_highlighted).slice(0, 3);

  return (
    <div className="space-y-10">
      {highlighted.length > 0 && (
        <div>
          <p className="section-label mb-3">Öne Çıkanlar</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highlighted.map((outfit) => (
              <div key={`h-${outfit.id}`} className="group relative border border-neutral-200">
                <Link
                  href={`/outfit/${outfit.id}`}
                  className="relative block w-full aspect-[3/4] overflow-hidden bg-neutral-50"
                >
                  <Image
                    src={outfit.image_url}
                    alt={outfit.title}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </Link>

                {isOwner && (
                  <button
                    onClick={() => togglePin(outfit)}
                    disabled={pinningId === outfit.id}
                    title="Öne çıkanlardan kaldır"
                    className="absolute top-2 right-2 bg-primary text-dark p-1.5"
                  >
                    <Pin size={13} fill="currentColor" />
                  </button>
                )}

                <div className="p-3">
                  <p className="font-serif italic text-ink text-sm truncate">{outfit.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="section-label mb-3">Dolabım</p>
        <div className="grid grid-cols-3 gap-1">
          {items.map((outfit) => (
            <div key={outfit.id} className="group relative aspect-square overflow-hidden bg-neutral-50">
              <Link href={`/outfit/${outfit.id}`} className="absolute inset-0 block">
                <Image
                  src={outfit.image_url}
                  alt={outfit.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Heart size={16} fill="currentColor" />
                    <span className="text-sm font-medium">{outfit.like_count}</span>
                  </span>
                </div>
              </Link>

              {isOwner && (
                <button
                  onClick={() => togglePin(outfit)}
                  disabled={pinningId === outfit.id}
                  title={outfit.is_highlighted ? "Öne çıkanlardan kaldır" : "Öne çıkar"}
                  className={`absolute top-1.5 right-1.5 z-10 p-1 transition-colors ${
                    outfit.is_highlighted
                      ? "bg-primary text-dark"
                      : "bg-paper/80 text-ink opacity-0 group-hover:opacity-100"
                  }`}
                >
                  <Pin size={12} fill={outfit.is_highlighted ? "currentColor" : "none"} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
