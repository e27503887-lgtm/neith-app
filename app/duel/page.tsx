"use client";

// Sadece düello akışı: art arda düellolar, üstte bugünkü oy sayacı.
// Kart kendi içinde otomatik yenilenir; her başarılı oy sayacı artırır.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import OutfitDuelCard from "../components/OutfitDuelCard";
import EmptyState from "../components/EmptyState";
import type { DuelOutfit } from "@/lib/duel";

const POOL_LIMIT = 120;

export default function DuelPage() {
  const [pool, setPool] = useState<DuelOutfit[] | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: outfits }, { data: auth }] = await Promise.all([
        supabase
          .from("outfits")
          .select("id, title, image_url, style_tag, user_id")
          .not("style_tag", "is", null)
          .order("created_at", { ascending: false })
          .limit(POOL_LIMIT),
        supabase.auth.getUser(),
      ]);

      let voted = 0;
      if (auth.user) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("duel_votes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", auth.user.id)
          .gte("created_at", startOfDay.toISOString());
        voted = count ?? 0;
      }

      if (!active) return;
      setPool((outfits ?? []) as DuelOutfit[]);
      setTodayCount(voted);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 border-b border-neutral-200 pb-6 flex items-end justify-between gap-4">
          <div>
            <p className="section-label mb-2">Topluluk Anketi</p>
            <h1 className="font-serif text-3xl text-ink tracking-tight">Kombin Düellosu</h1>
          </div>
          {todayCount !== null && todayCount > 0 && (
            <p className="font-serif italic text-sm text-gray-600 whitespace-nowrap">
              Bugün {todayCount} oy kullandın
            </p>
          )}
        </div>

        {pool === null ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : pool.length < 2 ? (
          <EmptyState
            title="Düello için yeterli kombin yok"
            description="Stil etiketli kombinler çoğaldıkça düellolar burada başlayacak."
            ctaLabel="Kombin Paylaş"
            ctaHref="/outfit/new"
          />
        ) : (
          <div className="flex flex-col gap-6">
            <OutfitDuelCard
              pool={pool}
              onVoted={() => setTodayCount((c) => (c ?? 0) + 1)}
            />
            <p className="text-center">
              <Link
                href="/outfits"
                className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
              >
                ← Kombin Akışına Dön
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
