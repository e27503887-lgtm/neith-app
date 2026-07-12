"use client";

// Kombin akışı (mobil odaklı):
// - Akıllı filtre çubuğu: stil + dönem + "Satın Alınabilir", tek kaydırılabilir
//   satırda, seçililer başta, AND mantığıyla; seçim URL'e yansır
//   (?style=…&era=…&buyable=1) — link paylaşımı aynı görünümü açar.
// - Sonsuz akış: 10'ar kombin, sona yaklaşınca otomatik devam.
// - Az sonuçta "Bu stile benzer kombinler" (aynı dönem, diğer stiller).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { Fragment } from "react";
import OutfitFeedCard, { type FeedCardOutfit } from "./OutfitFeedCard";
import OutfitDuelCard from "./OutfitDuelCard";
import EmptyState from "./EmptyState";
import type { DuelOutfit } from "@/lib/duel";
import { STYLE_TAGS } from "@/lib/styles";
import { ERAS } from "@/lib/eras";
import { excludeBlocked, mixFeed } from "@/lib/feed-mixer";
import { supabase } from "../utils/supabase";
import { getBlockedUserIds } from "../utils/blocks";

const PAGE_SIZE = 10;
const LOW_RESULT_THRESHOLD = 4;
const SIMILAR_LIMIT = 6;

type FeedOutfit = FeedCardOutfit & {
  era?: string | null;
  created_at?: string | null;
  like_count?: number | null;
  user_id?: string | null;
  elo_rating?: number | null;
};

const DUEL_INTERVAL = 6;

export default function OutfitsFeed({ outfits }: { outfits: FeedOutfit[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeStyle = searchParams.get("style");
  const activeEra = searchParams.get("era");
  const buyableOnly = searchParams.get("buyable") === "1";

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [userStyleTags, setUserStyleTags] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    getBlockedUserIds().then((ids) => {
      if (active && ids.size > 0) setBlockedIds(ids);
    });
    return () => {
      active = false;
    };
  }, []);

  // Stil DNA lite: profil etiketleri doluysa eşleşenler öne çekilir.
  useEffect(() => {
    let active = true;

    async function loadStyleDna() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("style_tags")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active && profile?.style_tags?.length) {
        setUserStyleTags(profile.style_tags);
      }
    }

    loadStyleDna();
    return () => {
      active = false;
    };
  }, []);

  function setFilters(next: { style?: string | null; era?: string | null; buyable?: boolean }) {
    const params = new URLSearchParams(searchParams.toString());
    const apply = (key: string, value: string | null | undefined) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    if ("style" in next) apply("style", next.style);
    if ("era" in next) apply("era", next.era);
    if ("buyable" in next) apply("buyable", next.buyable ? "1" : null);

    const query = params.toString();
    router.replace(query ? `/outfits?${query}` : "/outfits", { scroll: false });
    setVisibleCount(PAGE_SIZE);
  }

  const mixed = useMemo(
    () =>
      mixFeed(
        excludeBlocked(outfits, blockedIds, (o) => o.user_id),
        {
          getCreatedAt: (o) => o.created_at,
          getLikeCount: (o) => o.like_count,
          getStyleTag: (o) => o.style_tag,
          getEloRating: (o) => o.elo_rating,
          userStyleTags,
        }
      ),
    [outfits, userStyleTags, blockedIds]
  );

  // Filtreler AND ile birlikte çalışır.
  const matched = useMemo(
    () =>
      mixed.filter((o) => {
        if (activeStyle && o.style_tag !== activeStyle) return false;
        if (activeEra && o.era !== activeEra) return false;
        if (buyableOnly && (o.pieces?.length ?? 0) === 0) return false;
        return true;
      }),
    [mixed, activeStyle, activeEra, buyableOnly]
  );

  // Az sonuç: aynı dönemden (varsa) ama diğer stillerden kombinler.
  const similar = useMemo(() => {
    if (matched.length >= LOW_RESULT_THRESHOLD) return [];
    const matchedIds = new Set(matched.map((o) => o.id));
    return mixed
      .filter((o) => {
        if (matchedIds.has(o.id)) return false;
        if (activeEra && o.era !== activeEra) return false;
        if (buyableOnly && (o.pieces?.length ?? 0) === 0) return false;
        return true;
      })
      .slice(0, SIMILAR_LIMIT);
  }, [matched, mixed, activeEra, buyableOnly]);

  // Sonsuz akış: sentinel görünür olunca bir sayfa daha aç.
  const hasMore = visibleCount < matched.length;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, matched.length));
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, matched.length]);

  const visible = matched.slice(0, visibleCount);

  // Filtre çubuğu: seçililer başta olacak şekilde tek kaydırılabilir satır.
  type Chip = {
    key: string;
    label: React.ReactNode;
    selected: boolean;
    onToggle: () => void;
  };

  const chips: Chip[] = [
    {
      key: "buyable",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag size={12} strokeWidth={1.5} />
          Satın Alınabilir
        </span>
      ),
      selected: buyableOnly,
      onToggle: () => setFilters({ buyable: !buyableOnly }),
    },
    ...ERAS.map((era) => ({
      key: `era-${era.value}`,
      label: era.label,
      selected: activeEra === era.value,
      onToggle: () => setFilters({ era: activeEra === era.value ? null : era.value }),
    })),
    ...STYLE_TAGS.map((tag) => ({
      key: `style-${tag}`,
      label: tag,
      selected: activeStyle === tag,
      onToggle: () => setFilters({ style: activeStyle === tag ? null : tag }),
    })),
  ].sort((a, b) => Number(b.selected) - Number(a.selected));

  const anyFilter = !!activeStyle || !!activeEra || buyableOnly;

  const duelPool: DuelOutfit[] = outfits.map((o) => ({
    id: o.id,
    title: o.title,
    image_url: o.image_url,
    style_tag: o.style_tag,
    user_id: o.user_id ?? null,
    elo_rating: o.elo_rating ?? null,
    // Kör oylama: OutfitDuelCard bunu yalnızca oy verildikten sonra gösterir.
    username: o.username ?? null,
    avatar_url: o.avatar_url ?? null,
  }));

  // withDuels: her ~DUEL_INTERVAL kartta bir tam satırlık düello kartı.
  const renderGrid = (list: FeedOutfit[], withDuels = false) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {list.map((outfit, index) => (
        <Fragment key={outfit.id}>
          <OutfitFeedCard
            outfit={outfit}
            onStyleTagSelect={(tag) => setFilters({ style: tag })}
          />
          {withDuels && (index + 1) % DUEL_INTERVAL === 0 && (
            <div className="col-span-2 md:col-span-3">
              <OutfitDuelCard pool={duelPool} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        <button
          type="button"
          onClick={() => setFilters({ style: null, era: null, buyable: false })}
          className={`shrink-0 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
            !anyFilter
              ? "bg-ink text-paper border-ink"
              : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
          }`}
        >
          Tümü
        </button>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onToggle}
            aria-pressed={chip.selected}
            className={`shrink-0 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
              chip.selected
                ? "bg-ink text-paper border-ink"
                : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {matched.length === 0 ? (
        <EmptyState
          title="Bu stilde henüz kombin yok"
          description="Bu stilin ilk yorumunu sen yapabilirsin."
          ctaLabel="İlk kombini sen paylaş"
          ctaHref="/outfit/new"
        />
      ) : (
        <>
          {renderGrid(visible, true)}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8" aria-hidden>
              <span className="h-5 w-5 rounded-full border border-neutral-300 border-t-accent animate-spin" />
            </div>
          )}
        </>
      )}

      {similar.length > 0 && (
        <section className="mt-12 border-t border-neutral-200 pt-8">
          <p className="section-label mb-2">Keşfetmeye Devam Et</p>
          <h2 className="font-serif italic text-2xl text-ink mb-6">Bu stile benzer kombinler</h2>
          {renderGrid(similar)}
        </section>
      )}
    </div>
  );
}
