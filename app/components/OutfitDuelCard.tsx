"use client";

// "⚔ Hangisi Daha İyi?" — dergi anketi hissinde kombin düellosu kartı.
// Aynı stil etiketinden, farklı kullanıcılardan iki kombin; oylayanın
// kendi kombini havuza girmez. Oy duel_votes'a normalize edilmiş çiftle
// yazılır (küçük id = outfit_a); unique ihlali "zaten oylamış" demektir,
// doğrudan sonuçlar gösterilir. Girişsiz dokunuş /login'e gider.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import {
  normalizePair,
  pairKey,
  pickDuelPair,
  type DuelOutfit,
  type DuelPair,
} from "@/lib/duel";

const RESULT_MS = 2200;

type Phase = "idle" | "reveal";

export default function OutfitDuelCard({
  pool,
  onVoted,
  autoAdvance = true,
}: {
  pool: DuelOutfit[];
  // /duel sayfasındaki sayaç için: başarılı yeni oy sonrası çağrılır.
  onVoted?: () => void;
  autoAdvance?: boolean;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [pair, setPair] = useState<DuelPair | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [chosenId, setChosenId] = useState<number | string | null>(null);
  const [percents, setPercents] = useState<{ a: number; b: number } | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const seenPairs = useRef(new Set<string>());
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });
    return () => {
      active = false;
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const excludeUserId = userId ?? null;

  // İlk çift: auth durumu belli olunca seç (kendi kombinleri dışlansın diye).
  useEffect(() => {
    if (userId === undefined) return;
    const first = pickDuelPair(pool, { excludeUserId, excludePairs: seenPairs.current });
    if (first) seenPairs.current.add(pairKey(first.a.id, first.b.id));
    setPair(first);
    setExhausted(!first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pool]);

  function nextDuel() {
    const next = pickDuelPair(pool, { excludeUserId, excludePairs: seenPairs.current });
    if (!next) {
      setExhausted(true);
      setPair(null);
      return;
    }
    seenPairs.current.add(pairKey(next.a.id, next.b.id));
    setPair(next);
    setPhase("idle");
    setChosenId(null);
    setPercents(null);
  }

  async function loadResults(current: DuelPair) {
    const { data } = await supabase
      .from("duel_votes")
      .select("winner_id")
      .eq("outfit_a_id", current.a.id)
      .eq("outfit_b_id", current.b.id);

    const votes = data ?? [];
    const total = votes.length || 1;
    const aVotes = votes.filter((v) => String(v.winner_id) === String(current.a.id)).length;
    const aPct = Math.round((aVotes / total) * 100);
    setPercents({ a: aPct, b: 100 - aPct });
  }

  async function handlePick(winner: DuelOutfit) {
    if (!pair || phase !== "idle") return;
    if (!userId) {
      router.push("/login");
      return;
    }

    setChosenId(winner.id);
    setPhase("reveal");

    const { a, b } = normalizePair(pair.a, pair.b);
    const { error } = await supabase.from("duel_votes").insert([
      { user_id: userId, outfit_a_id: a.id, outfit_b_id: b.id, winner_id: winner.id },
    ]);

    // 23505: bu çifti zaten oylamış — doğrudan sonuçları göster.
    if (!error) onVoted?.();
    if (!error || error.code === "23505") {
      await loadResults({ a, b });
    }

    if (autoAdvance) {
      advanceTimer.current = setTimeout(nextDuel, RESULT_MS);
    }
  }

  const sides = useMemo(() => (pair ? [pair.a, pair.b] : []), [pair]);

  if (exhausted || !pair) return null;

  const normalized = normalizePair(pair.a, pair.b);

  return (
    <article className="bg-surface border border-neutral-200 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="section-label">⚔ Hangisi Daha İyi?</p>
        {pair.a.style_tag && (
          <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-neutral-300 px-2 py-0.5">
            {pair.a.style_tag}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sides.map((outfit) => {
          const isChosen = chosenId !== null && String(chosenId) === String(outfit.id);
          const pct =
            percents === null
              ? null
              : String(outfit.id) === String(normalized.a.id)
                ? percents.a
                : percents.b;

          return (
            <button
              key={String(outfit.id)}
              type="button"
              onClick={() => handlePick(outfit)}
              disabled={phase !== "idle"}
              aria-label={`${outfit.title} kombinine oy ver`}
              className={`group relative overflow-hidden border text-left transition-all duration-300 ${
                isChosen
                  ? "border-accent ring-1 ring-accent scale-[1.02]"
                  : "border-neutral-200"
              } ${phase === "reveal" && !isChosen ? "opacity-70" : ""}`}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                <Image
                  src={outfit.image_url}
                  alt={outfit.title}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>

              {pct !== null && (
                <div className="p-2.5">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-semibold text-sm text-ink">%{pct}</span>
                    {isChosen && (
                      <span className="text-[10px] uppercase tracking-wide text-accent">
                        Senin seçimin
                      </span>
                    )}
                  </div>
                  <div className="h-1 w-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-accent transition-[width] duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-serif italic text-xs text-gray-500">
          Dokun, tarafını seç — topluluk ne demiş gör.
        </p>
        <Link
          href="/duel"
          className="text-xs uppercase tracking-wide text-accent hover:text-ink transition-colors"
        >
          Daha fazla düello →
        </Link>
      </div>
    </article>
  );
}
