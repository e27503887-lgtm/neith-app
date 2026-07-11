// Kural tabanlı kombin motoru — saf TS, dış API yok.
// Ana ürünün kategorisine göre tamamlayıcı slotları belirler (hard
// constraint), adayları stil/dönem/renk/silüet/fiyat matrisine göre
// puanlar ve slot başına en iyi adaylardan 2-3 tam kombin kurar.
// Veri eksikse (renk/fit/stil null) ilgili bileşen atlanır, ceza yok.

import type { Category } from "./categories";
import type { ColorGroup } from "./colors";
import { getCategoryLabel } from "./categories";
import { getEraLabel } from "./eras";

export type Fit = "dar" | "normal" | "bol" | "oversize";

export const FIT_OPTIONS: { value: Fit; label: string }[] = [
  { value: "dar", label: "Dar" },
  { value: "normal", label: "Normal" },
  { value: "bol", label: "Bol" },
  { value: "oversize", label: "Oversize" },
];

export type EngineProduct = {
  id: number | string;
  title: string;
  price: number | null;
  category: string | null;
  era: string | null;
  style_tag: string | null;
  color_group: ColorGroup | null;
  fit: Fit | null;
  image_url: string | null;
  user_id?: string | null;
  is_sold?: boolean | null;
};

type Slot = { category: Category; optional: boolean };

// SLOT KURALI: ana ürünün kategorisi → tamamlayıcı slotlar.
const SLOT_RULES: Partial<Record<Category, Slot[]>> = {
  alt_giyim: [
    { category: "ust_giyim", optional: false },
    { category: "ayakkabi", optional: false },
    { category: "dis_giyim", optional: true },
  ],
  ust_giyim: [
    { category: "alt_giyim", optional: false },
    { category: "ayakkabi", optional: false },
  ],
  elbise: [
    { category: "ayakkabi", optional: false },
    { category: "dis_giyim", optional: true },
  ],
  ayakkabi: [
    { category: "ust_giyim", optional: false },
    { category: "alt_giyim", optional: false },
  ],
};

// Stil uyum matrisi. Aynı etiket +30 zaten ayrı kural; buradaki çiftler
// "farklı ama uyumlu" (+15) ya da "çatışan" (−15) kombinasyonlar.
// Etiketler karşılaştırmadan önce küçük harfe indirgenir.
const STYLE_HARMONY: [string, string][] = [
  ["minimalist", "old money"],
  ["minimalist", "sporty"],
  ["minimalist", "oversize"],
  ["vintage", "old money"],
  ["vintage", "grunge"],
  ["vintage", "y2k"],
  ["streetwear", "sporty"],
  ["streetwear", "y2k"],
  ["streetwear", "oversize"],
  ["streetwear", "grunge"],
  ["sporty", "blokecore"],
  ["y2k", "blokecore"],
  ["oversize", "grunge"],
];

const STYLE_CLASH: [string, string][] = [
  ["y2k", "old money"],
  ["grunge", "old money"],
  ["blokecore", "old money"],
  ["grunge", "minimalist"],
  ["y2k", "minimalist"],
];

function normalizeStyle(tag: string | null): string | null {
  return tag ? tag.trim().toLowerCase() : null;
}

function inPairList(list: [string, string][], a: string, b: string): boolean {
  return list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

// Açıklama cümlesi için puan kazandıran kuralların kimlikleri.
type ReasonId =
  | "style_match"
  | "style_harmony"
  | "era_match"
  | "color_both_neutral"
  | "color_neutral_accent"
  | "color_monochrome"
  | "fit_balance"
  | "profile_match";

type ScoredCandidate = {
  product: EngineProduct;
  score: number;
  reasons: ReasonId[];
};

function scoreCandidate(
  anchor: EngineProduct,
  candidate: EngineProduct,
  userStyleTags: string[]
): ScoredCandidate {
  let score = 0;
  const reasons: ReasonId[] = [];

  // Stil
  const anchorStyle = normalizeStyle(anchor.style_tag);
  const candidateStyle = normalizeStyle(candidate.style_tag);
  if (anchorStyle && candidateStyle) {
    if (anchorStyle === candidateStyle) {
      score += 30;
      reasons.push("style_match");
    } else if (inPairList(STYLE_HARMONY, anchorStyle, candidateStyle)) {
      score += 15;
      reasons.push("style_harmony");
    } else if (inPairList(STYLE_CLASH, anchorStyle, candidateStyle)) {
      score -= 15;
    }
  }

  // Dönem
  if (anchor.era && candidate.era && anchor.era === candidate.era) {
    score += 15;
    reasons.push("era_match");
  }

  // Renk
  const a = anchor.color_group;
  const c = candidate.color_group;
  if (a && c) {
    // Renk uyumu en kritik parametre (Net-a-Porter bulgusu) — +30.
    if (a === "notr" && c === "notr") {
      score += 30;
      reasons.push("color_both_neutral");
    } else if ((a === "notr" && c === "canli") || (a === "canli" && c === "notr")) {
      score += 30;
      reasons.push("color_neutral_accent");
    } else if (a === c) {
      score += 20;
      reasons.push("color_monochrome");
    } else if (a === "canli" && c === "canli") {
      score -= 30;
    }
  }

  // Silüet
  if (anchor.fit && candidate.fit) {
    const anchorVoluminous = anchor.fit === "oversize" || anchor.fit === "bol";
    const candidateVoluminous = candidate.fit === "oversize" || candidate.fit === "bol";
    if (anchorVoluminous && (candidate.fit === "dar" || candidate.fit === "normal")) {
      score += 25;
      reasons.push("fit_balance");
    } else if (anchorVoluminous && candidateVoluminous) {
      score -= 40;
    }
  }

  // Kullanıcı profili stil örtüşmesi
  if (candidateStyle && userStyleTags.some((t) => normalizeStyle(t) === candidateStyle)) {
    score += 10;
    reasons.push("profile_match");
  }

  // Fiyat dengesi: aday, ana ürünün 0.3x-3x aralığındaysa küçük bonus.
  if (
    typeof anchor.price === "number" &&
    typeof candidate.price === "number" &&
    anchor.price > 0 &&
    candidate.price >= anchor.price * 0.3 &&
    candidate.price <= anchor.price * 3
  ) {
    score += 5;
  }

  return { product: candidate, score, reasons };
}

// --- Açıklama cümlesi (şablonlu, dergi stilist notu tonunda) ---

const REASON_PRIORITY: ReasonId[] = [
  "fit_balance",
  "color_neutral_accent",
  "color_monochrome",
  "color_both_neutral",
  "style_match",
  "style_harmony",
  "era_match",
  "profile_match",
];

function reasonPhrase(
  reason: ReasonId,
  anchor: EngineProduct,
  items: ScoredCandidate[]
): string | null {
  switch (reason) {
    case "fit_balance": {
      const slim = items.find((i) => i.reasons.includes("fit_balance"));
      const slotLabel = slim ? getCategoryLabel(slim.product.category)?.toLowerCase() : null;
      return `hacimli silüeti dengelemek için ${
        slotLabel ? `daha dar kesim bir ${slotLabel}` : "daha dar kesim parçalar"
      } seçtik`;
    }
    case "color_neutral_accent":
      return "nötr bir tuval üzerine tek bir canlı vurgu yerleştirdik";
    case "color_monochrome":
      return "aynı renk ailesinde kalan monokrom bir bütünlük kurduk";
    case "color_both_neutral":
      return "nötr tonlar birbirini yormadan tamamlıyor";
    case "style_match": {
      const style = anchor.style_tag ?? items.find((i) => i.product.style_tag)?.product.style_tag;
      return style ? `${style} çizgisi kombinin tamamında ortak bir dil kuruyor` : null;
    }
    case "style_harmony": {
      const other = items.find((i) => i.reasons.includes("style_harmony"));
      if (anchor.style_tag && other?.product.style_tag) {
        return `${anchor.style_tag} ile ${other.product.style_tag} birbirini tamamlayan iki karakter`;
      }
      return "farklı ama birbirini tamamlayan stiller bir arada";
    }
    case "era_match": {
      const eraLabel = anchor.era ? getEraLabel(anchor.era) : null;
      return eraLabel ? `${eraLabel} dönem ruhu görünümün tamamına yayılıyor` : null;
    }
    case "profile_match":
      return "senin stil kimliğinle de örtüşen bir seçim";
    default:
      return null;
  }
}

function capitalizeTr(text: string): string {
  if (!text) return text;
  const first = text[0] === "i" ? "İ" : text[0].toLocaleUpperCase("tr-TR");
  return first + text.slice(1);
}

function buildExplanation(anchor: EngineProduct, items: ScoredCandidate[]): string {
  const seen = new Set<ReasonId>();
  for (const item of items) {
    for (const reason of item.reasons) seen.add(reason);
  }

  const phrases: string[] = [];
  for (const reason of REASON_PRIORITY) {
    if (phrases.length >= 2) break;
    if (!seen.has(reason)) continue;
    const phrase = reasonPhrase(reason, anchor, items);
    if (phrase) phrases.push(phrase);
  }

  if (phrases.length === 0) {
    return "Parçalar birbirini zorlamadan tamamlayan sade bir görünüm kuruyor.";
  }
  return capitalizeTr(phrases.join("; ")) + ".";
}

// --- Kombin kurma ---

export type OutfitItem = {
  slot: Category;
  product: EngineProduct;
  score: number;
};

export type OutfitSuggestion = {
  anchor: EngineProduct;
  items: OutfitItem[];
  totalScore: number;
  totalPrice: number;
  explanation: string;
};

// Opsiyonel slot (ör. dış giyim) ancak anlamlı puan topluyorsa kombine girer.
const OPTIONAL_SLOT_MIN_SCORE = 15;

export function buildOutfitSuggestions({
  anchor,
  candidates,
  userStyleTags = [],
  maxOutfits = 3,
  wardrobeMode = false,
}: {
  anchor: EngineProduct;
  candidates: EngineProduct[];
  userStyleTags?: string[];
  maxOutfits?: number;
  // Stil Asistanı takvimi kullanıcının kendi gardırobundan kombin kurar;
  // orada "kendi ilanı olmayan" kısıtı uygulanmaz.
  wardrobeMode?: boolean;
}): OutfitSuggestion[] {
  const slots = anchor.category ? SLOT_RULES[anchor.category as Category] : undefined;
  if (!slots) return [];

  // Hard constraint: satılmamış ve (pazar modunda) başkasına ait ürünler.
  const eligible = candidates.filter((c) => {
    if (c.id === anchor.id) return false;
    if (c.is_sold) return false;
    if (!wardrobeMode && c.user_id && anchor.user_id && c.user_id === anchor.user_id) {
      return false;
    }
    return true;
  });

  // Slot başına puanlanmış ve sıralanmış adaylar.
  const rankedBySlot = new Map<Category, ScoredCandidate[]>();
  for (const slot of slots) {
    const ranked = eligible
      .filter((c) => c.category === slot.category)
      .map((c) => scoreCandidate(anchor, c, userStyleTags))
      .sort((x, y) => y.score - x.score);
    rankedBySlot.set(slot.category, ranked);
  }

  const requiredSlots = slots.filter((s) => !s.optional);
  if (requiredSlots.some((s) => (rankedBySlot.get(s.category)?.length ?? 0) === 0)) {
    return [];
  }

  // i. varyant her slotta i. en iyi adayı dener (yoksa en iyiye düşer);
  // birebir aynı parça setini tekrar eden varyantlar elenir.
  const suggestions: OutfitSuggestion[] = [];
  const seenCombos = new Set<string>();

  for (let variant = 0; variant < maxOutfits; variant++) {
    const items: OutfitItem[] = [];

    for (const slot of slots) {
      const ranked = rankedBySlot.get(slot.category) ?? [];
      if (ranked.length === 0) continue;
      const pick = ranked[Math.min(variant, ranked.length - 1)];
      if (slot.optional && pick.score < OPTIONAL_SLOT_MIN_SCORE) continue;
      items.push({ slot: slot.category, product: pick.product, score: pick.score });
    }

    if (requiredSlots.some((s) => !items.find((i) => i.slot === s.category))) continue;

    const key = items
      .map((i) => String(i.product.id))
      .sort()
      .join("|");
    if (seenCombos.has(key)) continue;
    seenCombos.add(key);

    const scored = items.map((i) => {
      const ranked = rankedBySlot.get(i.slot) ?? [];
      return ranked.find((r) => r.product.id === i.product.id)!;
    });

    suggestions.push({
      anchor,
      items,
      totalScore: items.reduce((sum, i) => sum + i.score, 0),
      totalPrice:
        (anchor.price ?? 0) + items.reduce((sum, i) => sum + (i.product.price ?? 0), 0),
      explanation: buildExplanation(anchor, scored),
    });
  }

  return suggestions.sort((a, b) => b.totalScore - a.totalScore);
}

// Ana ürünün kategorisi için hangi kategorilerin aday çekilmesi gerektiği
// (veri katmanı sorguyu buna göre daraltır).
export function getSlotCategories(category: string | null): Category[] {
  const slots = category ? SLOT_RULES[category as Category] : undefined;
  return slots ? slots.map((s) => s.category) : [];
}
