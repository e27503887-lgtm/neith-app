import { getEloTier } from "@/lib/eloTier";

// Ham elo_rating sayısını asla göstermez — yalnızca dolaylı, editoryal bir
// "Seviye" rozeti. Eşik altındaysa (veya veri yoksa) hiçbir şey render etmez.
export default function EloTierBadge({
  eloRating,
  className = "",
}: {
  eloRating: number | null | undefined;
  className?: string;
}) {
  const tier = getEloTier(eloRating);
  if (!tier) return null;

  const accentTier = tier.key === "ikon";

  return (
    <span
      className={`text-[10px] uppercase tracking-wide font-medium px-2 py-1 ${
        accentTier ? "bg-accent text-paper" : "bg-paper/90 text-ink"
      } ${className}`}
    >
      {tier.label}
    </span>
  );
}
