"use client";

// Haftalık Turnuva — /duel'deki sürekli düello akışından ayrı bir mod.
// Bracket: Çeyrek Final → Yarı Final → Final, sade çizgili 3 sütun (dergi
// grafik tasarımı hissinde, agresif e-spor grafiklerinden kaçınılır). Kör
// oylama mantığı burada da geçerli — bkz. TournamentMatchVoter.

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import EmptyState from "../components/EmptyState";
import TournamentMatchVoter, { type TournamentOutfitInfo } from "../components/TournamentMatchVoter";
import {
  ROUND_LABELS,
  ROUND_ORDER,
  matchPercents,
  type Tournament,
  type TournamentMatch,
} from "@/lib/tournament";

type ChampionSummary = {
  tournamentId: number | string;
  completedAt: string | null;
  outfit: TournamentOutfitInfo;
};

export default function TournamentPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [tournament, setTournament] = useState<Tournament | null | undefined>(undefined);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [outfitsById, setOutfitsById] = useState<Map<string, TournamentOutfitInfo>>(new Map());
  const [myVotes, setMyVotes] = useState<Map<string, number | string>>(new Map());
  const [history, setHistory] = useState<ChampionSummary[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | string | null>(null);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);

    const { data: activeRows } = await supabase
      .from("duel_tournaments")
      .select("*")
      .eq("status", "active")
      .limit(1);
    const active = (activeRows?.[0] as Tournament) ?? null;
    setTournament(active);

    const outfitIds = new Set<number | string>();

    if (active) {
      const { data: matchRows } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", active.id)
        .order("match_index", { ascending: true });
      const list = (matchRows ?? []) as TournamentMatch[];
      setMatches(list);
      list.forEach((m) => {
        if (m.outfit_a_id) outfitIds.add(m.outfit_a_id);
        if (m.outfit_b_id) outfitIds.add(m.outfit_b_id);
      });

      if (uid && list.length > 0) {
        const { data: voteRows } = await supabase
          .from("tournament_votes")
          .select("match_id, outfit_id")
          .eq("user_id", uid)
          .in(
            "match_id",
            list.map((m) => m.id)
          );
        setMyVotes(new Map((voteRows ?? []).map((v) => [String(v.match_id), v.outfit_id])));
      }
    } else {
      setMatches([]);
    }

    // Geçmiş şampiyonlar — turnuva aktif değilken galeri olarak gösterilir.
    const { data: completedRows } = await supabase
      .from("duel_tournaments")
      .select("*")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(12);
    (completedRows ?? []).forEach((t) => {
      if (t.champion_outfit_id) outfitIds.add(t.champion_outfit_id);
    });

    if (outfitIds.size > 0) {
      const { data: outfitRows } = await supabase
        .from("outfits")
        .select("id, title, image_url, style_tag, user_id")
        .in("id", [...outfitIds]);

      const userIds = [...new Set((outfitRows ?? []).map((o) => o.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds)
        : { data: [] as { id: string; username: string; avatar_url: string | null }[] };
      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const map = new Map<string, TournamentOutfitInfo>();
      (outfitRows ?? []).forEach((o) => {
        map.set(String(o.id), {
          id: o.id,
          title: o.title,
          image_url: o.image_url,
          style_tag: o.style_tag ?? null,
          username: profileById.get(o.user_id)?.username ?? null,
          avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
        });
      });
      setOutfitsById(map);

      setHistory(
        (completedRows ?? [])
          .filter((t) => t.champion_outfit_id && map.has(String(t.champion_outfit_id)))
          .map((t) => ({
            tournamentId: t.id,
            completedAt: t.completed_at,
            outfit: map.get(String(t.champion_outfit_id))!,
          }))
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  const finalMatch = matches.find((m) => m.round === "final") ?? null;
  const champion =
    finalMatch?.winner_id && outfitsById.has(String(finalMatch.winner_id))
      ? outfitsById.get(String(finalMatch.winner_id))!
      : null;

  const selectedMatch = matches.find((m) => String(m.id) === String(selectedMatchId)) ?? null;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10 border-b border-neutral-200 pb-8">
          <p className="section-label mb-2">Haftalık Turnuva</p>
          <h1 className="font-serif text-4xl text-ink tracking-tight">Kombin Turnuvası</h1>
          <p className="text-gray-500 text-sm mt-3 max-w-xl">
            Çeyrek final, yarı final ve finalle haftanın en beğenilen kombinini topluluk seçer.
          </p>
        </div>

        {tournament === undefined ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : tournament ? (
          <div className="space-y-10">
            {champion && (
              <section className="border border-accent/40 bg-surface p-6 md:p-10 text-center">
                <p className="section-label mb-4 justify-center">🏆 Haftanın İkonu</p>
                <Link href={`/outfit/${champion.id}`} className="inline-block group">
                  <div className="relative w-48 aspect-[3/4] mx-auto overflow-hidden border border-neutral-200">
                    <Image
                      src={champion.image_url}
                      alt={champion.title}
                      fill
                      sizes="192px"
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </div>
                  <p className="font-serif text-xl text-ink mt-4 group-hover:text-accent transition-colors">
                    @{champion.username ?? "bilinmeyen"}
                  </p>
                </Link>
              </section>
            )}

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">
                Şu an: {tournament.current_round ? ROUND_LABELS[tournament.current_round] : "—"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {ROUND_ORDER.map((round, roundIndex) => (
                  <div
                    key={round}
                    className={roundIndex > 0 ? "sm:border-l sm:border-neutral-200 sm:pl-6" : ""}
                  >
                    <p className="font-serif italic text-lg text-ink mb-3">{ROUND_LABELS[round]}</p>
                    <div className="space-y-4">
                      {matches
                        .filter((m) => m.round === round)
                        .map((match) => (
                          <BracketMatchCard
                            key={match.id}
                            match={match}
                            outfitsById={outfitsById}
                            voted={myVotes.has(String(match.id))}
                            onOpen={() => setSelectedMatchId(match.id)}
                          />
                        ))}
                      {matches.filter((m) => m.round === round).length === 0 && (
                        <p className="text-xs text-gray-400">Belirlenecek</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <EmptyState
              title="Şu an aktif bir turnuva yok"
              description="Yeni turnuva başladığında burada göreceksin."
            />
            {history.length > 0 && (
              <div className="mt-10">
                <p className="section-label mb-4">Geçmiş Şampiyonlar</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {history.map((h) => (
                    <Link key={String(h.tournamentId)} href={`/outfit/${h.outfit.id}`} className="group block">
                      <div className="relative aspect-[3/4] overflow-hidden border border-neutral-200 bg-neutral-50">
                        <Image
                          src={h.outfit.image_url}
                          alt={h.outfit.title}
                          fill
                          sizes="(min-width: 640px) 25vw, 50vw"
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1.5">
                        {h.completedAt ? new Date(h.completedAt).toLocaleDateString("tr-TR") : ""}
                      </p>
                      <p className="text-sm text-ink group-hover:text-accent transition-colors">
                        @{h.outfit.username ?? "bilinmeyen"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedMatch &&
        (() => {
          const a = outfitsById.get(String(selectedMatch.outfit_a_id));
          const b = outfitsById.get(String(selectedMatch.outfit_b_id));
          if (!a || !b) return null;
          return (
            <TournamentMatchVoter
              match={selectedMatch}
              outfitA={a}
              outfitB={b}
              myVote={myVotes.get(String(selectedMatch.id)) ?? null}
              userId={userId}
              onClose={() => setSelectedMatchId(null)}
              onVoted={() => {
                load();
              }}
            />
          );
        })()}
    </main>
  );
}

function BracketMatchCard({
  match,
  outfitsById,
  voted,
  onOpen,
}: {
  match: TournamentMatch;
  outfitsById: Map<string, TournamentOutfitInfo>;
  voted: boolean;
  onOpen: () => void;
}) {
  const a = outfitsById.get(String(match.outfit_a_id));
  const b = outfitsById.get(String(match.outfit_b_id));

  if (!a || !b) {
    return (
      <div className="border border-dashed border-neutral-200 px-3 py-4 text-center text-xs text-gray-400">
        Belirlenecek
      </div>
    );
  }

  const revealed = voted || !!match.winner_id;
  const pct = matchPercents(match);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full border border-neutral-200 hover:border-ink transition-colors p-2.5 text-left"
    >
      <div className="flex items-center gap-2">
        <span className="relative w-9 h-9 shrink-0 overflow-hidden bg-neutral-100">
          <Image src={a.image_url} alt="" fill sizes="36px" className="object-cover" />
        </span>
        <span className="text-[10px] text-gray-400 shrink-0">vs</span>
        <span className="relative w-9 h-9 shrink-0 overflow-hidden bg-neutral-100">
          <Image src={b.image_url} alt="" fill sizes="36px" className="object-cover" />
        </span>
      </div>
      {revealed ? (
        <div className="mt-2 h-1 w-full bg-neutral-100 overflow-hidden">
          <div className="h-full bg-accent" style={{ width: `${pct.a}%` }} />
        </div>
      ) : (
        <p className="text-[10px] uppercase tracking-wide text-gray-500 mt-2">Oy ver</p>
      )}
    </button>
  );
}
