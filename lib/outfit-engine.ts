// Kural tabanlı kombin motoru — saf TS, dış API yok.
// Ana ürünün kategorisine göre tamamlayıcı slotları belirler (hard
// constraint), adayları stil/dönem/renk/silüet/fiyat matrisine göre
// puanlar ve slot başına en iyi adaylardan 2-3 tam kombin kurar.
// Veri eksikse (renk/fit/stil null) ilgili bileşen atlanır, ceza yok.

import type { Category } from "./categories";
import type { ColorGroup } from "./colors";
import { getCategoryLabel } from "./categories";
import { getEraLabel } from "./eras";
import { getStyleSlug, normalizeStyleLabel, type StyleSlug } from "./styles";
import { getStyleCompatibility } from "./style-compatibility";
import { compareFabricWeight, getFabricLabel, getFabricWeight, type Fabric } from "./fabric";
import type { BodyType } from "./bodyType";
import type { SkinUndertone } from "./skinTone";

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
  fabric?: Fabric | null;
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

// Dönemsel/vintage karakterli stiller — belirgin bir tarihsel estetiğe
// gönderme yapar. "Vintage dengeleme" kuralında ana ürünün bu gruptan
// olup olmadığına bakılır.
const PERIOD_STYLE_SLUGS = new Set<StyleSlug>([
  "vintage",
  "grunge",
  "y2k",
  "boho_chic",
  "dark_academia",
]);

// Güncel/sade karşı ağırlık — dönemli bir parçayı dengelemek için aranan
// aday stilleri.
const MODERN_NEUTRAL_SLUGS = new Set<StyleSlug>(["minimalist", "quiet_luxury"]);

function normalizeStyle(tag: string | null): string | null {
  return normalizeStyleLabel(tag);
}

const TOP_OR_BOTTOM_CATEGORIES = new Set(["ust_giyim", "alt_giyim"]);
const TOP_OR_OUTER_CATEGORIES = new Set(["ust_giyim", "dis_giyim"]);
const VOLUMINOUS_FITS = new Set(["bol", "oversize"]);
const SLIM_OR_NORMAL_FITS = new Set(["dar", "normal"]);

// Vücut tipi katmanı — SESSİZ (açıklamaya asla yansımaz, bkz. çağrı yeri).
// Kullanıcının kendi profilinden gelir, null ise tamamen atlanır (nötr).
function bodyTypeAdjustment(
  bodyType: BodyType | null | undefined,
  anchor: EngineProduct,
  candidate: EngineProduct
): number {
  if (!bodyType) return 0;
  let adj = 0;

  if (bodyType === "kum_saati") {
    const bothDar = anchor.fit === "dar" && candidate.fit === "dar";
    const bothTopOrBottom =
      TOP_OR_BOTTOM_CATEGORIES.has(anchor.category ?? "") &&
      TOP_OR_BOTTOM_CATEGORIES.has(candidate.category ?? "");
    if (bothDar && bothTopOrBottom) adj += 10;
  }

  if (bodyType === "armut") {
    const topVoluminous =
      (TOP_OR_OUTER_CATEGORIES.has(anchor.category ?? "") && VOLUMINOUS_FITS.has(anchor.fit ?? "")) ||
      (TOP_OR_OUTER_CATEGORIES.has(candidate.category ?? "") && VOLUMINOUS_FITS.has(candidate.fit ?? ""));
    if (topVoluminous) adj += 10;

    const bottomOversize =
      (anchor.category === "alt_giyim" && anchor.fit === "oversize") ||
      (candidate.category === "alt_giyim" && candidate.fit === "oversize");
    if (bottomOversize) adj -= 10;
  }

  if (bodyType === "ters_ucgen") {
    const topSlim =
      (TOP_OR_OUTER_CATEGORIES.has(anchor.category ?? "") && SLIM_OR_NORMAL_FITS.has(anchor.fit ?? "")) ||
      (TOP_OR_OUTER_CATEGORIES.has(candidate.category ?? "") && SLIM_OR_NORMAL_FITS.has(candidate.fit ?? ""));
    if (topSlim) adj += 10;

    const bottomVoluminous =
      (anchor.category === "alt_giyim" && anchor.fit === "bol") ||
      (candidate.category === "alt_giyim" && candidate.fit === "bol");
    if (bottomVoluminous) adj += 10;
  }

  if (bodyType === "dikdortgen") {
    const hasDress = anchor.category === "elbise" || candidate.category === "elbise";
    if (hasDress) adj += 10;

    const bottomBol =
      (anchor.category === "alt_giyim" && anchor.fit === "bol") ||
      (candidate.category === "alt_giyim" && candidate.fit === "bol");
    if (bottomBol) adj += 5;
  }

  return adj;
}

// "Yüz yakını" kategoriler — ayakkabı/çanta/aksesuar yüzden uzak olduğu
// için cilt alt tonu kuralı onları etkilemez.
const FACE_NEAR_CATEGORIES = new Set(["ust_giyim", "dis_giyim", "elbise"]);

// Cilt alt tonu katmanı — en hassas kişisel katman, SESSİZ (açıklamaya
// asla yansımaz). Mevcut genel renk uyumu kuralının ÜZERİNE eklenir, onu
// değiştirmez. Kullanıcı 'notr' ya da null ise tamamen atlanır.
function skinToneAdjustment(
  skinUndertone: SkinUndertone | null | undefined,
  anchor: EngineProduct,
  candidate: EngineProduct
): number {
  if (!skinUndertone || skinUndertone === "notr") return 0;

  let adj = 0;
  for (const item of [anchor, candidate]) {
    if (FACE_NEAR_CATEGORIES.has(item.category ?? "") && item.color_group === skinUndertone) {
      adj += 8;
    }
  }
  return adj;
}

// Açıklama cümlesi için puan kazandıran kuralların kimlikleri.
export type ReasonId =
  | "style_match"
  | "style_harmony"
  | "vintage_balance"
  | "era_match"
  | "color_both_neutral"
  | "color_neutral_accent"
  | "color_monochrome"
  | "fit_balance"
  | "layering_balance"
  | "profile_match";

type ScoredCandidate = {
  product: EngineProduct;
  score: number;
  reasons: ReasonId[];
  // İleride bir "kişiselleştirmeyi kapat" ayarıyla bu katmanı tek yerden
  // açıp kapatabilmek için genel/kişisel skor ayrı tutulur (bkz. madde 4).
  generalScore: number;
  personalizationScore: number;
};

// GENEL KURALLAR — kullanıcı profiline bakmaz, ürünlerin kendi
// nitelikleriyle çalışır: dönem, renk uyumu, silüet dengesi, fiyat.
function scoreGeneral(
  anchor: EngineProduct,
  candidate: EngineProduct
): { score: number; reasons: ReasonId[] } {
  let score = 0;
  const reasons: ReasonId[] = [];

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

  return { score, reasons };
}

// KİŞİSELLEŞTİRME KATMANI — stil eşleşmesi, vintage denge, kumaş
// (katmanlama), vücut tipi ve cilt alt tonu; ayrıca kullanıcının kendi
// seçtiği stil etiketleriyle örtüşme. Hepsi ya ürünün kendi stil/kumaş
// niteliklerinden ya da GİRİŞ YAPAN KULLANICININ kendi profilinden gelir —
// ileride tek bir anahtarla topluca kapatılabilmesi için ayrı tutulur.
function scorePersonalization(
  anchor: EngineProduct,
  candidate: EngineProduct,
  userStyleTags: string[],
  userBodyType?: BodyType | null,
  userSkinUndertone?: SkinUndertone | null
): { score: number; reasons: ReasonId[] } {
  let score = 0;
  const reasons: ReasonId[] = [];

  // Stil
  const anchorStyle = normalizeStyle(anchor.style_tag);
  const candidateStyle = normalizeStyle(candidate.style_tag);
  if (anchorStyle && candidateStyle) {
    if (anchorStyle === candidateStyle) {
      score += 30;
      reasons.push("style_match");
    } else {
      const compat = getStyleCompatibility(anchor.style_tag, candidate.style_tag);
      if (compat === "uyumlu") {
        score += 12;
        reasons.push("style_harmony");
      } else if (compat === "catisir") {
        score -= 25;
      }
      // 'notr' → ne bonus ne ceza, açıklamaya yansımaz.
    }
  }

  // Vintage dengeleme: ana ürün dönemli/vintage karakterliyse (ve kendisi
  // zaten güncel/sade değilse), güncel + sade bir adayla dengelenmesi ekstra
  // puan alır ("dönem parçasını modern parçayla dengele").
  if (anchor.era && anchor.era !== "guncel") {
    const anchorSlug = getStyleSlug(anchor.style_tag);
    const candidateSlug = getStyleSlug(candidate.style_tag);
    const anchorIsPeriod = !!anchorSlug && PERIOD_STYLE_SLUGS.has(anchorSlug);
    const anchorIsModernNeutral = !!anchorSlug && MODERN_NEUTRAL_SLUGS.has(anchorSlug);
    const candidateIsModernNeutral = !!candidateSlug && MODERN_NEUTRAL_SLUGS.has(candidateSlug);

    if (
      anchorIsPeriod &&
      !anchorIsModernNeutral &&
      candidate.era === "guncel" &&
      candidateIsModernNeutral
    ) {
      score += 15;
      reasons.push("vintage_balance");
    }
  }

  // Katmanlama dengesi: ana ürün dış giyim, aday iç giyimse (dış üstte,
  // içteki altında giyilir), dış giyim en az iç giyim kadar ağır/yapılandırılmış
  // olmalı. Ana dıştaki daha hafifse (ince ceket + kalın kazak) ceza.
  const anchorFabricWeight = getFabricWeight(anchor.fabric);
  const candidateFabricWeight = getFabricWeight(candidate.fabric);
  if (anchorFabricWeight && candidateFabricWeight && anchor.category === "dis_giyim" && candidate.category === "ust_giyim") {
    const cmp = compareFabricWeight(anchorFabricWeight, candidateFabricWeight);
    if (cmp >= 0) {
      score += 15;
      reasons.push("layering_balance");
    } else {
      score -= 20;
    }
  }

  // Vücut tipi (sessiz — açıklamaya asla eklenmez).
  score += bodyTypeAdjustment(userBodyType, anchor, candidate);

  // Cilt alt tonu (sessiz — en hassas katman, açıklamaya asla eklenmez;
  // mevcut genel renk uyumu kuralının üzerine eklenir, onu değiştirmez).
  score += skinToneAdjustment(userSkinUndertone, anchor, candidate);

  // Kullanıcı profili stil örtüşmesi — bu da kullanıcının kendi tercihi.
  if (candidateStyle && userStyleTags.some((t) => normalizeStyle(t) === candidateStyle)) {
    score += 10;
    reasons.push("profile_match");
  }

  return { score, reasons };
}

function scoreCandidate(
  anchor: EngineProduct,
  candidate: EngineProduct,
  userStyleTags: string[],
  userBodyType?: BodyType | null,
  userSkinUndertone?: SkinUndertone | null
): ScoredCandidate {
  const general = scoreGeneral(anchor, candidate);
  const personalization = scorePersonalization(
    anchor,
    candidate,
    userStyleTags,
    userBodyType,
    userSkinUndertone
  );

  return {
    product: candidate,
    score: general.score + personalization.score,
    reasons: [...general.reasons, ...personalization.reasons],
    generalScore: general.score,
    personalizationScore: personalization.score,
  };
}

// İki parçanın YÖNSÜZ nesnel uyumu — "Dolabım / Kombinlerim" uyum skorunda
// kullanılır. Kullanıcıya özel katmanlar (vücut tipi/cilt tonu/kendi stil
// etiketleri) kasıtlı olarak dışarıda bırakılır: bu iki parçanın kendi
// aralarındaki uyumu, kimin baktığından bağımsız olmalı. Slot kuralları
// (anchor/candidate) yön belirttiği için iki yönde de hesaplanıp yüksek
// olan (daha anlamlı yönlenme) alınır.
export function scorePairDetails(
  a: EngineProduct,
  b: EngineProduct
): { score: number; reasons: ReasonId[] } {
  const forwardGeneral = scoreGeneral(a, b);
  const forwardPersonalization = scorePersonalization(a, b, []);
  const forward = {
    score: forwardGeneral.score + forwardPersonalization.score,
    reasons: [...forwardGeneral.reasons, ...forwardPersonalization.reasons],
  };

  const backwardGeneral = scoreGeneral(b, a);
  const backwardPersonalization = scorePersonalization(b, a, []);
  const backward = {
    score: backwardGeneral.score + backwardPersonalization.score,
    reasons: [...backwardGeneral.reasons, ...backwardPersonalization.reasons],
  };

  return forward.score >= backward.score ? forward : backward;
}

// --- Açıklama cümlesi (şablonlu, dergi stilist notu tonunda) ---

const REASON_PRIORITY: ReasonId[] = [
  "layering_balance",
  "fit_balance",
  "vintage_balance",
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
    case "layering_balance": {
      const layered = items.find((i) => i.reasons.includes("layering_balance"));
      const anchorFabricLabel = getFabricLabel(anchor.fabric)?.toLowerCase();
      const candidateFabricLabel = layered ? getFabricLabel(layered.product.fabric)?.toLowerCase() : null;
      return `kalın${anchorFabricLabel ? ` ${anchorFabricLabel}` : ""} dış giyim, ince${
        candidateFabricLabel ? ` ${candidateFabricLabel}` : ""
      } bir parçanın üzerine kusursuz oturuyor`;
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
        return `${anchor.style_tag} ile ${other.product.style_tag} bir arada şıklık katıyor`;
      }
      return "farklı ama birbirini tamamlayan stiller bir arada";
    }
    case "vintage_balance":
      return "dönem parçasını güncel, sade bir seçimle dengeledik";
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
  userBodyType = null,
  userSkinUndertone = null,
  maxOutfits = 3,
  wardrobeMode = false,
}: {
  anchor: EngineProduct;
  candidates: EngineProduct[];
  userStyleTags?: string[];
  // Giriş yapmış GÖRÜNTÜLEYEN kullanıcının kendi vücut tipi/cilt alt tonu —
  // yalnızca onun gördüğü önerileri etkiler, ürüne/kombine hiçbir şekilde
  // yazılmaz ve başka kullanıcının önerilerinde asla kullanılmaz.
  userBodyType?: BodyType | null;
  userSkinUndertone?: SkinUndertone | null;
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
      .map((c) => scoreCandidate(anchor, c, userStyleTags, userBodyType, userSkinUndertone))
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
