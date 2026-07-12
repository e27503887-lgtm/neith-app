"use client";

// Sadece düello akışı: art arda düellolar, üstte seri/ilerleme göstergesi,
// altta göreceli liderlik tablosu. Kart kendi içinde otomatik yenilenir;
// her başarılı oy sayaçları tazeler.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import OutfitDuelCard from "../components/OutfitDuelCard";
import DuelLeaderboard from "../components/DuelLeaderboard";
import EmptyState from "../components/EmptyState";
import type { DuelOutfit } from "@/lib/duel";

const POOL_LIMIT = 120;
const DAILY_GOAL = 10;

type StreakStats = {
  duel_streak: number;
  streak_freezes: number;
};

export default function DuelPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pool, setPool] = useState<DuelOutfit[] | null>(null);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakStats | null>(null);
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const lastSeenStreak = useRef<number | null>(null);

  // Bugünkü oy sayısı — daily_vote_counts tablosundan.
  async function loadTodayCount(userId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_vote_counts")
      .select("vote_count")
      .eq("user_id", userId)
      .eq("vote_date", today)
      .maybeSingle();
    setTodayCount(data?.vote_count ?? 0);
  }

  async function loadStreak(userId: string, options: { announceMilestone?: boolean } = {}) {
    const { data } = await supabase
      .from("profiles")
      .select("duel_streak, streak_freezes")
      .eq("id", userId)
      .maybeSingle();

    const next = { duel_streak: data?.duel_streak ?? 0, streak_freezes: data?.streak_freezes ?? 0 };
    setStreak(next);

    if (
      options.announceMilestone &&
      next.duel_streak > 0 &&
      next.duel_streak % 7 === 0 &&
      lastSeenStreak.current !== null &&
      next.duel_streak > lastSeenStreak.current
    ) {
      setMilestoneToast("🎉 7 günlük seriye ulaştın, bir Seri Dondurma kazandın!");
      setTimeout(() => setMilestoneToast(null), 5000);
    }
    lastSeenStreak.current = next.duel_streak;
  }

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: auth } = await supabase.auth.getUser();

      // Seri dondurma günlük kontrolü: bir gün atlanmışsa dondurma varsa
      // harcanır ve seri korunur (bkz. db/duel_streaks.sql). Sayfa her
      // açıldığında bir kez çağrılır — sonuçları hemen ardından okunur.
      if (auth.user) {
        await supabase.rpc("check_streak_freeze");
      }

      const [{ data: outfits }] = await Promise.all([
        supabase
          .from("outfits")
          .select("id, title, image_url, style_tag, user_id, elo_rating")
          .not("style_tag", "is", null)
          .order("created_at", { ascending: false })
          .limit(POOL_LIMIT),
      ]);

      // Kör oylama: paylaşan bilgisi yalnızca oy verildikten SONRA
      // gösterilir (bkz. OutfitDuelCard) — yine de veriyi burada, tek
      // sorguda çekip karta hazır taşımak daha verimli.
      const userIds = [...new Set((outfits ?? []).map((o) => o.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
        : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const enrichedPool: DuelOutfit[] = (outfits ?? []).map((o) => ({
        ...o,
        username: profileById.get(o.user_id)?.username ?? null,
        avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
      }));

      if (!active) return;
      setUser(auth.user ?? null);
      setPool(enrichedPool);

      if (auth.user) {
        await Promise.all([loadTodayCount(auth.user.id), loadStreak(auth.user.id)]);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleVoted() {
    setTodayCount((c) => (c ?? 0) + 1);
    if (user) {
      await loadStreak(user.id, { announceMilestone: true });
    }
  }

  const progressPct = todayCount !== null ? Math.min(100, Math.round((todayCount / DAILY_GOAL) * 100)) : 0;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 border-b border-neutral-200 pb-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="section-label mb-2">Topluluk Anketi</p>
              <h1 className="font-serif text-3xl text-ink tracking-tight">Kombin Düellosu</h1>
            </div>
            {streak && streak.duel_streak > 0 && (
              <p className="font-serif italic text-sm text-gray-600 whitespace-nowrap">
                🔥 {streak.duel_streak} günlük seri
              </p>
            )}
          </div>

          {todayCount !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                <span>
                  Bugün {todayCount}/{DAILY_GOAL} oy
                </span>
              </div>
              <div className="h-1 w-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {milestoneToast && (
          <p className="mb-6 text-sm text-ink border border-accent/40 bg-paper px-4 py-3 animate-fade-in">
            {milestoneToast}
          </p>
        )}

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
          <div className="flex flex-col gap-8">
            <OutfitDuelCard pool={pool} onVoted={handleVoted} />

            {user && <DuelLeaderboard user={user} />}

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
