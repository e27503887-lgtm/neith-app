// Dolabım (wardrobe_items) satır tipi — tamamen kişisel, herkese açık
// products/outfits tablolarıyla karıştırılmaz. RLS zaten sahiplik dışı
// erişimi engelliyor; bu dosya yalnızca ortak TS tipini taşır.

import type { ColorGroup } from "./colors";
import { scorePairDetails, type EngineProduct, type Fit, type ReasonId } from "./outfit-engine";
import type { Fabric } from "./fabric";

export type WardrobeItem = {
  id: number | string;
  user_id: string;
  image_url: string;
  label: string | null;
  category: string | null;
  dominant_color: string | null;
  color_group: ColorGroup | null;
  fit: Fit | null;
  fabric: Fabric | null;
  style_tag: string | null;
  era: string | null;
  created_at?: string;
};

export const WARDROBE_OTHER_LABEL = "Diğer";

// Boş/whitespace label'ları "Diğer" ortak şeridine düşürür.
export function normalizeWardrobeLabel(label: string | null | undefined): string {
  const trimmed = label?.trim();
  return trimmed ? trimmed : WARDROBE_OTHER_LABEL;
}

// "Kombinlerim" (personal_outfits) satır tipi — tamamen kişisel.
export type PersonalOutfit = {
  id: number | string;
  user_id: string;
  photo_url: string | null;
  note: string | null;
  compatibility_score: number | null;
  created_at?: string;
};

export function toEngineProduct(item: WardrobeItem): EngineProduct {
  return {
    id: item.id,
    title: item.label ?? "",
    price: null,
    category: item.category,
    era: item.era,
    style_tag: item.style_tag,
    color_group: item.color_group,
    fit: item.fit,
    fabric: item.fabric,
    image_url: item.image_url,
  };
}

// Ortalama çift skorunu 0-100'e sabit bir bölenle normalize eder: nötr
// (hiçbir kural tetiklenmemiş) çift ortalaması ~50 civarına düşer, güçlü
// uyum 100'e, belirgin çatışma 0'a yaklaşır.
const COMPATIBILITY_OFFSET = 80;
const COMPATIBILITY_RANGE = 160;

export type WardrobeInsight = { score: number; reasonSet: Set<ReasonId> };

export function computeWardrobeInsight(items: WardrobeItem[]): WardrobeInsight | null {
  if (items.length < 2) return null;

  const engineItems = items.map(toEngineProduct);
  const reasonSet = new Set<ReasonId>();
  let total = 0;
  let pairCount = 0;

  for (let i = 0; i < engineItems.length; i++) {
    for (let j = i + 1; j < engineItems.length; j++) {
      const { score, reasons } = scorePairDetails(engineItems[i], engineItems[j]);
      total += score;
      pairCount += 1;
      reasons.forEach((r) => reasonSet.add(r));
    }
  }

  const average = total / pairCount;
  const normalized = ((average + COMPATIBILITY_OFFSET) / COMPATIBILITY_RANGE) * 100;
  return { score: Math.max(0, Math.min(100, Math.round(normalized))), reasonSet };
}

// lib/outfit-engine.ts'teki akıcı stilist cümlelerinden türetilmiş, tek bir
// kombine ait birden çok çiftin ortak gerekçesini özetleyen kısa ifadeler.
const REASON_SHORT_PHRASES: Partial<Record<ReasonId, string>> = {
  fit_balance: "silüet oranı dengeli",
  layering_balance: "katmanlama dengeli",
  color_neutral_accent: "renk dengesi güçlü",
  color_monochrome: "renk uyumu monokrom ve güçlü",
  color_both_neutral: "renk dengesi güçlü",
  style_match: "stil dili tutarlı",
  style_harmony: "stiller birbirini tamamlıyor",
  vintage_balance: "dönem ve güncel denge kurulmuş",
  era_match: "dönem uyumu güçlü",
};

const REASON_SHORT_PRIORITY: ReasonId[] = [
  "fit_balance",
  "layering_balance",
  "color_neutral_accent",
  "color_monochrome",
  "color_both_neutral",
  "style_match",
  "style_harmony",
  "vintage_balance",
  "era_match",
];

function capitalizeTr(text: string): string {
  if (!text) return text;
  const first = text[0] === "i" ? "İ" : text[0].toLocaleUpperCase("tr-TR");
  return first + text.slice(1);
}

export function buildWardrobeExplanation(reasonSet: Set<ReasonId>): string {
  const phrases: string[] = [];
  for (const reason of REASON_SHORT_PRIORITY) {
    if (phrases.length >= 2) break;
    const phrase = REASON_SHORT_PHRASES[reason];
    if (reasonSet.has(reason) && phrase) phrases.push(phrase);
  }

  if (phrases.length === 0) {
    return "Parçalar birbirini zorlamadan tamamlıyor.";
  }
  return capitalizeTr(phrases.join(", ")) + ".";
}
