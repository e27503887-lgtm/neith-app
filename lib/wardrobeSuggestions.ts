// "Öneriler" sekmesinin saf mantığı — dolap verisiyle çalışır, herkese
// açık akışla ilgisi yok. lib/outfit-engine.ts'teki slot kuralı ve
// puanlama motorunu (lib/wardrobe.ts üzerinden) yeniden kullanır.

import { getSlotCategories, scorePairDetails, type ReasonId } from "./outfit-engine";
import {
  buildWardrobeExplanation,
  computeWardrobeInsight,
  toEngineProduct,
  type WardrobeItem,
} from "./wardrobe";
import { getCategoryLabel } from "./categories";

// Performans sınırı: dolap büyükse (>30 parça) her kategori bu sayıya
// rastgele örneklenir — kombinasyon patlamasını önler.
const LARGE_WARDROBE_THRESHOLD = 30;
const MAX_PER_CATEGORY_WHEN_LARGE = 8;

function sampleCategory(items: WardrobeItem[], cap: number): WardrobeItem[] {
  if (items.length <= cap) return items;
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, cap);
}

function groupByCategory(items: WardrobeItem[]): Record<string, WardrobeItem[]> {
  const groups: Record<string, WardrobeItem[]> = {};
  for (const item of items) {
    const key = item.category ?? "";
    if (!key) continue;
    (groups[key] ??= []).push(item);
  }
  return groups;
}

export type OutfitCandidate = {
  items: WardrobeItem[];
  score: number;
  explanation: string;
};

// SEKME A — Sıfırdan Kombin Oluştur: iki geçerli desen (üst+alt+ayakkabı,
// elbise+ayakkabı; ikisine de opsiyonel dış giyim) üzerinden tüm olası
// kombinasyonları tarar, en yüksek skorludan başlayarak sıralar.
export function buildFromScratchCandidates(allItems: WardrobeItem[], limit = 5): OutfitCandidate[] {
  const large = allItems.length > LARGE_WARDROBE_THRESHOLD;
  const groups = groupByCategory(allItems);
  const cap = (list: WardrobeItem[]) =>
    large ? sampleCategory(list, MAX_PER_CATEGORY_WHEN_LARGE) : list;

  const tops = cap(groups["ust_giyim"] ?? []);
  const bottoms = cap(groups["alt_giyim"] ?? []);
  const shoes = cap(groups["ayakkabi"] ?? []);
  const dresses = cap(groups["elbise"] ?? []);
  const outers = cap(groups["dis_giyim"] ?? []);

  const sets: WardrobeItem[][] = [];

  for (const top of tops) {
    for (const bottom of bottoms) {
      for (const shoe of shoes) {
        sets.push([top, bottom, shoe]);
        for (const outer of outers) {
          sets.push([top, bottom, shoe, outer]);
        }
      }
    }
  }
  for (const dress of dresses) {
    for (const shoe of shoes) {
      sets.push([dress, shoe]);
      for (const outer of outers) {
        sets.push([dress, shoe, outer]);
      }
    }
  }

  const candidates: OutfitCandidate[] = [];
  for (const set of sets) {
    const insight = computeWardrobeInsight(set);
    if (!insight) continue;
    candidates.push({
      items: set,
      score: insight.score,
      explanation: buildWardrobeExplanation(insight.reasonSet),
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

// "Sıfırdan Kombin Oluştur" hiç aday üretemediğinde (iki desen de
// kurulamıyorsa) eksik kategorileri Türkçe etiketleriyle döner.
export function getMissingScratchCategories(allItems: WardrobeItem[]): string[] {
  const groups = groupByCategory(allItems);
  const has = (cat: string) => (groups[cat]?.length ?? 0) > 0;

  const pattern1Ready = has("ust_giyim") && has("alt_giyim") && has("ayakkabi");
  const pattern2Ready = has("elbise") && has("ayakkabi");
  if (pattern1Ready || pattern2Ready) return [];

  const missing: string[] = [];
  if (!has("ust_giyim")) missing.push(getCategoryLabel("ust_giyim")!);
  if (!has("alt_giyim")) missing.push(getCategoryLabel("alt_giyim")!);
  if (!has("ayakkabi")) missing.push(getCategoryLabel("ayakkabi")!);
  return missing;
}

export type CompletionSuggestion = {
  item: WardrobeItem;
  category: string;
  score: number;
  explanation: string;
};

// SEKME B — Bu Parçayı Tamamla: seçilen parçanın slot kategorilerinde
// (getSlotCategories) en yüksek skorlu tek adayı seçer.
export function buildCompletionSuggestions(
  anchor: WardrobeItem,
  allItems: WardrobeItem[]
): CompletionSuggestion[] {
  const slotCategories = getSlotCategories(anchor.category);
  const anchorEngine = toEngineProduct(anchor);
  const suggestions: CompletionSuggestion[] = [];

  for (const category of slotCategories) {
    const candidates = allItems.filter((i) => i.id !== anchor.id && i.category === category);
    if (candidates.length === 0) continue;

    let best: { item: WardrobeItem; score: number; reasons: ReasonId[] } | null = null;
    for (const candidate of candidates) {
      const { score, reasons } = scorePairDetails(anchorEngine, toEngineProduct(candidate));
      if (!best || score > best.score) {
        best = { item: candidate, score, reasons };
      }
    }

    if (best) {
      suggestions.push({
        item: best.item,
        category,
        score: best.score,
        explanation: buildWardrobeExplanation(new Set(best.reasons)),
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score);
}

// Bulunamayan slot kategorilerini (dolapta o kategoriden hiç parça yoksa)
// Türkçe etiketleriyle döner — "eksik kategori" yönlendirmesi için.
export function getMissingCompletionCategories(
  anchor: WardrobeItem,
  allItems: WardrobeItem[]
): string[] {
  const slotCategories = getSlotCategories(anchor.category);
  const groups = groupByCategory(allItems.filter((i) => i.id !== anchor.id));
  return slotCategories
    .filter((cat) => (groups[cat]?.length ?? 0) === 0)
    .map((cat) => getCategoryLabel(cat) ?? cat);
}
