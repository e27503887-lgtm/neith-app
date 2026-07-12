// Kombin Düellosu'ndan gelen elo_rating'i kullanıcıya doğrudan gösterilecek
// ham sayı yerine 3 kademeli, editoryal bir "Seviye" rozetine çevirir.
// 1150 altı hiç gösterilmez (henüz yeterli düello geçmişi yok / nötr).

export type EloTierKey = "begenilen" | "trend" | "ikon";

export type EloTier = { key: EloTierKey; label: string };

const TIERS: { min: number; key: EloTierKey; label: string }[] = [
  { min: 1450, key: "ikon", label: "İkon" },
  { min: 1300, key: "trend", label: "Trend" },
  { min: 1150, key: "begenilen", label: "Beğenilen" },
];

export function getEloTier(elo: number | null | undefined): EloTier | null {
  if (elo == null) return null;
  for (const tier of TIERS) {
    if (elo >= tier.min) return { key: tier.key, label: tier.label };
  }
  return null;
}
