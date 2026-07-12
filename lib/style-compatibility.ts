// Stiller arası uyum matrisi — kombin motorunun farklı-stil puanlaması
// bunu okur. Gruplar birbiriyle "uyumlu"; açıkça listelenen çiftler
// "catisir"; tanımsız her kombinasyon "notr" (ne bonus ne ceza).

import { STYLE_SLUGS, getStyleSlug, type StyleSlug } from "./styles";

export type StyleCompat = "uyumlu" | "notr" | "catisir";

// Sessiz/klasik zarafet ailesi.
const QUIET_LUXURY_GROUP: StyleSlug[] = [
  "quiet_luxury",
  "minimalist",
  "old_money",
  "preppy",
  "parisian",
  "dark_academia",
];

// İşlevsel/outdoor ailesi.
const UTILITY_GROUP: StyleSlug[] = ["techwear", "gorpcore", "sporty", "streetwear"];

// Asi/dekonstrükte aile.
const REBELLIOUS_GROUP: StyleSlug[] = ["grunge", "darkwear", "avant_garde", "y2k"];

// Bohem aile.
const BOHEMIAN_GROUP: StyleSlug[] = ["boho_chic", "vintage", "scandinavian"];

const GROUPS: StyleSlug[][] = [
  QUIET_LUXURY_GROUP,
  UTILITY_GROUP,
  REBELLIOUS_GROUP,
  BOHEMIAN_GROUP,
];

// Açık çatışmalar — gruplar arası, yukarıdaki grupların hiçbiriyle
// çakışmaz (aynı çift hem 'uyumlu' hem 'catisir' olamaz).
const CLASHES: [StyleSlug, StyleSlug][] = [
  ["quiet_luxury", "grunge"],
  ["quiet_luxury", "darkwear"],
  ["quiet_luxury", "y2k"],
  ["old_money", "grunge"],
  ["old_money", "darkwear"],
  ["old_money", "y2k"],
  ["techwear", "boho_chic"],
  ["techwear", "parisian"],
  ["gorpcore", "boho_chic"],
  ["gorpcore", "parisian"],
  ["avant_garde", "preppy"],
  ["avant_garde", "old_money"],
];

function pairKey(a: StyleSlug, b: StyleSlug): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const MATRIX = new Map<string, StyleCompat>();

for (const group of GROUPS) {
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      MATRIX.set(pairKey(group[i], group[j]), "uyumlu");
    }
  }
}
for (const [a, b] of CLASHES) {
  MATRIX.set(pairKey(a, b), "catisir");
}

// Sadece FARKLI iki stil için çağrılmalı — aynı stil eşleşmesi
// (style_tag === style_tag) motorda ayrı, daha yüksek puanlı bir kural.
export function getStyleCompatibility(
  labelA: string | null | undefined,
  labelB: string | null | undefined
): StyleCompat {
  const slugA = getStyleSlug(labelA);
  const slugB = getStyleSlug(labelB);
  if (!slugA || !slugB || slugA === slugB) return "notr";
  return MATRIX.get(pairKey(slugA, slugB)) ?? "notr";
}

// Testler/araçlar için: tüm slug'ların tanımlı olduğunu doğrulamak isteyen
// çağıranlar bu listeyi kullanabilir.
export const ALL_STYLE_SLUGS = STYLE_SLUGS;
