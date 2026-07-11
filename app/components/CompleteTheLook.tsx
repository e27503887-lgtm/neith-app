"use client";

// "Bu Parçayla Kombin Kur" — ürün detay sayfasındaki kural tabanlı
// kombin önerileri. Adayları çeker, lib/outfit-engine ile puanlar,
// 2-3 tam kombin kartı gösterir. Öneri kurulamazsa bölüm hiç görünmez.

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import {
  buildOutfitSuggestions,
  getSlotCategories,
  type EngineProduct,
  type OutfitSuggestion,
} from "@/lib/outfit-engine";

const CANDIDATE_LIMIT = 80;

const ENGINE_FIELDS =
  "id, title, price, category, era, style_tag, fit, color_group, image_url, user_id, is_sold";

export default function CompleteTheLook({ anchor }: { anchor: EngineProduct }) {
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const slotCategories = getSlotCategories(anchor.category);
      if (slotCategories.length === 0) {
        if (active) setSuggestions([]);
        return;
      }

      const candidatesQuery = supabase
        .from("products")
        .select(ENGINE_FIELDS)
        .in("category", slotCategories)
        .or("is_sold.is.null,is_sold.eq.false")
        .neq("user_id", anchor.user_id ?? "")
        .order("created_at", { ascending: false })
        .limit(CANDIDATE_LIMIT);

      const [{ data: candidates }, { data: auth }] = await Promise.all([
        candidatesQuery,
        supabase.auth.getUser(),
      ]);

      let userStyleTags: string[] = [];
      if (auth.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("style_tags")
          .eq("id", auth.user.id)
          .maybeSingle();
        userStyleTags = profile?.style_tags ?? [];
      }

      if (!active) return;

      setSuggestions(
        buildOutfitSuggestions({
          anchor,
          candidates: (candidates ?? []) as EngineProduct[],
          userStyleTags,
        })
      );
    }

    load();
    return () => {
      active = false;
    };
    // anchor sunucudan gelen sabit bir satır; id değişmedikçe yeniden çekme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor.id]);

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <section className="bg-surface border border-neutral-200 p-6 md:p-10">
      <div className="mb-6">
        <p className="section-label mb-2">Stilist Önerisi</p>
        <h2 className="font-serif italic text-3xl text-ink">Bu Parçayla Kombin Kur</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestions.map((suggestion, index) => (
          <div key={index} className="border border-neutral-200 p-4 flex flex-col">
            <div className="flex gap-2">
              <div className="relative flex-1 aspect-[3/4] overflow-hidden bg-neutral-50">
                {anchor.image_url && (
                  <Image
                    src={anchor.image_url}
                    alt={anchor.title}
                    fill
                    sizes="(min-width: 768px) 20vw, 40vw"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                {suggestion.items.map((item) => (
                  <Link
                    key={String(item.product.id)}
                    href={`/product/${item.product.id}`}
                    className="relative flex-1 overflow-hidden bg-neutral-50 group"
                  >
                    {item.product.image_url && (
                      <Image
                        src={item.product.image_url}
                        alt={item.product.title}
                        fill
                        sizes="(min-width: 768px) 10vw, 20vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            <p className="font-serif italic text-sm text-gray-600 leading-6 mt-4 flex-1">
              {suggestion.explanation}
            </p>

            <p className="text-xs uppercase tracking-wide text-ink mt-3 pt-3 border-t border-neutral-200">
              Bu görünüm:{" "}
              <span className="font-semibold normal-case text-base">
                {suggestion.totalPrice.toLocaleString("tr-TR")} ₺
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
