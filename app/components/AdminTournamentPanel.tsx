"use client";

// Admin panelindeki "Turnuva" sekmesi. Turnuva ilerletme mantığı tamamen
// Supabase fonksiyonlarında (start_weekly_tournament, advance_tournament_round)
// — burası yalnızca durumu gösterip bu RPC'leri tetikliyor.

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  ROUND_LABELS,
  ROUND_ORDER,
  matchPercents,
  type Tournament,
  type TournamentMatch,
} from "@/lib/tournament";
import { supabase } from "../utils/supabase";

type OutfitLite = { id: number | string; title: string; image_url: string; username: string };

export default function AdminTournamentPanel() {
  const [active, setActive] = useState<Tournament | null | undefined>(undefined);
  const [history, setHistory] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [outfitsById, setOutfitsById] = useState<Map<string, OutfitLite>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [{ data: activeRows }, { data: historyRows }] = await Promise.all([
      supabase.from("duel_tournaments").select("*").eq("status", "active").limit(1),
      supabase
        .from("duel_tournaments")
        .select("*")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

    const currentActive = (activeRows?.[0] as Tournament) ?? null;
    setActive(currentActive);
    setHistory((historyRows ?? []) as Tournament[]);

    const outfitIds = new Set<number | string>();
    let matchRows: TournamentMatch[] = [];

    if (currentActive) {
      const { data } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", currentActive.id)
        .order("match_index", { ascending: true });
      matchRows = (data ?? []) as TournamentMatch[];
      matchRows.forEach((m) => {
        outfitIds.add(m.outfit_a_id);
        outfitIds.add(m.outfit_b_id);
      });
    }
    (historyRows ?? []).forEach((t) => {
      if (t.champion_outfit_id) outfitIds.add(t.champion_outfit_id);
    });

    setMatches(matchRows);

    if (outfitIds.size > 0) {
      const { data: outfitRows } = await supabase
        .from("outfits")
        .select("id, title, image_url, user_id")
        .in("id", [...outfitIds]);

      const userIds = [...new Set((outfitRows ?? []).map((o) => o.user_id))];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("id, username").in("id", userIds)
        : { data: [] as { id: string; username: string }[] };
      const usernameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

      const map = new Map<string, OutfitLite>();
      (outfitRows ?? []).forEach((o) => {
        map.set(String(o.id), {
          id: o.id,
          title: o.title,
          image_url: o.image_url,
          username: usernameById.get(o.user_id) ?? "?",
        });
      });
      setOutfitsById(map);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStart() {
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("start_weekly_tournament");
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  async function handleAdvance() {
    if (!active?.current_round) return;
    setBusy(true);
    setError("");
    const { error: rpcError } = await supabase.rpc("advance_tournament_round", {
      tournament_id: active.id,
      round: active.current_round,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  }

  if (active === undefined) {
    return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  }

  const matchesByRound = ROUND_ORDER.map((round) => ({
    round,
    items: matches.filter((m) => m.round === round),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!active ? (
        <div className="border border-neutral-200 p-6 text-center">
          <p className="text-sm text-gray-600 mb-4">Şu anda aktif bir turnuva yok.</p>
          <button type="button" onClick={handleStart} disabled={busy} className="btn-primary">
            {busy ? "Başlatılıyor..." : "Bu Haftanın Turnuvasını Başlat"}
          </button>
        </div>
      ) : (
        <div className="border border-neutral-200 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="section-label mb-1">Aktif Turnuva</p>
              <h3 className="font-serif text-xl text-ink">
                {active.current_round ? ROUND_LABELS[active.current_round] : "—"}
              </h3>
            </div>
            <button type="button" onClick={handleAdvance} disabled={busy} className="btn-primary">
              {busy ? "İşleniyor..." : "Sonraki Tura Geç"}
            </button>
          </div>

          <div className="space-y-6">
            {matchesByRound.map(({ round, items }) => (
              <div key={round}>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  {ROUND_LABELS[round]}
                </p>
                <div className="space-y-2">
                  {items.map((match) => {
                    const a = outfitsById.get(String(match.outfit_a_id));
                    const b = outfitsById.get(String(match.outfit_b_id));
                    const pct = matchPercents(match);
                    return (
                      <div
                        key={match.id}
                        className="flex items-center gap-3 border border-neutral-200 px-3 py-2 text-sm"
                      >
                        <MiniOutfit outfit={a} />
                        <span className="text-xs text-gray-500 w-16 text-center shrink-0">
                          {match.votes_a} - {match.votes_b}
                        </span>
                        <MiniOutfit outfit={b} align="right" />
                        {match.winner_id && (
                          <span className="text-[10px] uppercase tracking-wide text-accent shrink-0">
                            %{String(match.winner_id) === String(match.outfit_a_id) ? pct.a : pct.b} kazandı
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="section-label mb-3">Turnuva Geçmişi</p>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz tamamlanmış turnuva yok.</p>
        ) : (
          <div className="divide-y divide-neutral-200 border border-neutral-200">
            {history.map((t) => {
              const champion = t.champion_outfit_id
                ? outfitsById.get(String(t.champion_outfit_id))
                : null;
              return (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <span className="text-xs text-gray-500 w-24 shrink-0">
                    {new Date(t.created_at).toLocaleDateString("tr-TR")}
                  </span>
                  {champion ? (
                    <>
                      <MiniOutfit outfit={champion} />
                      <span className="text-xs text-gray-600">🏆 {champion.title}</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">Şampiyon kaydı yok</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniOutfit({ outfit, align = "left" }: { outfit?: OutfitLite; align?: "left" | "right" }) {
  if (!outfit) {
    return <span className="flex-1 text-xs text-gray-400">—</span>;
  }
  return (
    <div className={`flex flex-1 min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="relative w-8 h-8 shrink-0 overflow-hidden bg-neutral-100">
        <Image src={outfit.image_url} alt={outfit.title} fill sizes="32px" className="object-cover" />
      </span>
      <span className="truncate text-xs text-gray-700">@{outfit.username}</span>
    </div>
  );
}
