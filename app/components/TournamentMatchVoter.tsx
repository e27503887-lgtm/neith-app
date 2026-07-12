"use client";

// Turnuva maçı oylama/detay modalı. Kör oylama mantığı /duel'deki
// OutfitDuelCard ile aynı: oy verilene/kazanılana kadar paylaşan kullanıcı
// bilgisi hiç render edilmez; oy verildikten (ya da maç zaten karara
// bağlandıktan) sonra aynı kart içinde ortaya çıkar.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import { matchPercents, type TournamentMatch } from "@/lib/tournament";

export type TournamentOutfitInfo = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  username: string | null;
  avatar_url: string | null;
};

export default function TournamentMatchVoter({
  match,
  outfitA,
  outfitB,
  myVote,
  userId,
  onClose,
  onVoted,
}: {
  match: TournamentMatch;
  outfitA: TournamentOutfitInfo;
  outfitB: TournamentOutfitInfo;
  myVote: number | string | null;
  userId: string | null;
  onClose: () => void;
  onVoted: () => void;
}) {
  const router = useRouter();
  const decided = !!match.winner_id || !!myVote;
  const [phase, setPhase] = useState<"idle" | "reveal">(decided ? "reveal" : "idle");
  const [chosenId, setChosenId] = useState<number | string | null>(myVote ?? match.winner_id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const percents = matchPercents(match);
  const sides = [outfitA, outfitB];

  async function handlePick(outfit: TournamentOutfitInfo) {
    if (phase !== "idle" || busy) return;
    if (!userId) {
      router.push("/login");
      return;
    }

    setBusy(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("cast_tournament_vote", {
      match_id: match.id,
      outfit_id: outfit.id,
    });

    setBusy(false);

    if (rpcError) {
      setError("Oy kaydedilemedi: " + rpcError.message);
      return;
    }

    setChosenId(outfit.id);
    setPhase("reveal");
    onVoted();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Turnuva maçı"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="section-label mb-1">⚔ Turnuva Maçı</p>
            {outfitA.style_tag && (
              <p className="text-xs text-gray-500">{outfitA.style_tag}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-gray-500 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {sides.map((outfit) => {
            const isChosen = chosenId !== null && String(chosenId) === String(outfit.id);
            const pct = String(outfit.id) === String(outfitA.id) ? percents.a : percents.b;

            return (
              <button
                key={String(outfit.id)}
                type="button"
                onClick={() => handlePick(outfit)}
                disabled={phase !== "idle" || busy}
                aria-label={`${outfit.title} kombinine oy ver`}
                className={`group relative overflow-hidden border text-left transition-all duration-300 ${
                  isChosen ? "border-accent ring-1 ring-accent scale-[1.02]" : "border-neutral-200"
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

                {phase === "reveal" && (
                  <div className="p-2.5">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="font-semibold text-sm text-ink">%{pct}</span>
                      {isChosen && (
                        <span className="text-[10px] uppercase tracking-wide text-accent">
                          {String(chosenId) === String(match.winner_id) ? "Kazandı" : "Senin seçimin"}
                        </span>
                      )}
                    </div>
                    <div className="h-1 w-full bg-neutral-100 overflow-hidden mb-2">
                      <div
                        className="h-full bg-accent transition-[width] duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Kör oylama: paylaşan bilgisi yalnızca burada, oy
                        verildikten (ya da maç karara bağlandıktan) sonra. */}
                    <Link
                      href={outfit.username ? `/profile/${outfit.username}` : "#"}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-100 animate-fade-in"
                    >
                      {outfit.avatar_url ? (
                        <Image
                          src={outfit.avatar_url}
                          alt={outfit.username ?? ""}
                          width={18}
                          height={18}
                          className="w-[18px] h-[18px] rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex w-[18px] h-[18px] items-center justify-center rounded-full bg-gray-200 text-[9px] font-semibold text-gray-600">
                          {outfit.username?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-600 truncate hover:text-accent transition-colors">
                        @{outfit.username ?? "bilinmeyen"}
                      </span>
                    </Link>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400 mt-3">{error}</p>}

        {phase === "idle" && (
          <p className="font-serif italic text-xs text-gray-500 mt-4 text-center">
            Dokun, tarafını seç — sonucu ve kimin paylaştığını hemen ardından gör.
          </p>
        )}
      </div>
    </div>
  );
}
