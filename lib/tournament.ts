// Haftalık turnuva/bracket sistemi — tipler ve sabitler. Elo hesaplaması
// gibi turnuva ilerletme mantığı da tamamen Supabase fonksiyonlarında
// (start_weekly_tournament, advance_tournament_round, cast_tournament_vote)
// yaşıyor; burada yalnızca SONUÇLARI okuyup göstermek için ortak tipler var.
//
// VARSAYILAN ŞEMA (gerçek kolon adlarınız farklıysa bu dosyayı ve
// app/admin/AdminTournamentPanel.tsx / app/tournament/page.tsx içindeki
// select() çağrılarını güncelleyin):
//   duel_tournaments(id, status 'active'|'completed', current_round,
//     champion_outfit_id, created_at, completed_at)
//   tournament_matches(id, tournament_id, round, outfit_a_id, outfit_b_id,
//     votes_a, votes_b, winner_id, match_index, created_at)
//   tournament_votes(id, match_id, user_id, outfit_id, created_at)

export type TournamentRound = "ceyrek_final" | "yari_final" | "final";

export const ROUND_ORDER: TournamentRound[] = ["ceyrek_final", "yari_final", "final"];

export const ROUND_LABELS: Record<TournamentRound, string> = {
  ceyrek_final: "Çeyrek Final",
  yari_final: "Yarı Final",
  final: "Final",
};

export type TournamentStatus = "active" | "completed";

export type Tournament = {
  id: number | string;
  status: TournamentStatus;
  current_round: TournamentRound | null;
  champion_outfit_id: number | string | null;
  created_at: string;
  completed_at: string | null;
};

export type TournamentMatch = {
  id: number | string;
  tournament_id: number | string;
  round: TournamentRound;
  outfit_a_id: number | string;
  outfit_b_id: number | string;
  votes_a: number;
  votes_b: number;
  winner_id: number | string | null;
  match_index: number | null;
  created_at: string;
};

export function nextRound(round: TournamentRound): TournamentRound | null {
  const index = ROUND_ORDER.indexOf(round);
  return index >= 0 && index < ROUND_ORDER.length - 1 ? ROUND_ORDER[index + 1] : null;
}

export function matchPercents(match: TournamentMatch): { a: number; b: number } {
  const total = match.votes_a + match.votes_b;
  if (total === 0) return { a: 0, b: 0 };
  const a = Math.round((match.votes_a / total) * 100);
  return { a, b: 100 - a };
}
