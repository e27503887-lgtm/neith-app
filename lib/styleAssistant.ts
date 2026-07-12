import { getEraLabel } from "./eras";
import { buildOutfitSuggestions, type EngineProduct } from "./outfit-engine";
import type { BodyType } from "./bodyType";
import type { SkinUndertone } from "./skinTone";

// Deterministic, rule-based "Stil Asistanı" engine — no external API calls.
// Every function here is a pure computation over the user's own products/outfits.

export const MIN_ITEMS = 3;

export const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];

const KEYWORD_DICTIONARY = [
  "oversize",
  "vintage",
  "spor",
  "klasik",
  "deri",
  "denim",
  "casual",
  "şık",
  "retro",
  "minimalist",
  "bohem",
  "sokak",
  "triko",
  "blazer",
  "kot",
  "elbise",
  "pastel",
  "monokrom",
];

const DEFAULT_KEYWORDS = ["kişisel", "özgün"];

const TEMPLATES = [
  "Tarzın {era} esintileri taşıyor; {kelime1} ve {kelime2} parçalara olan ilgin öne çıkıyor. {butce} seçimlerinle dengeli bir gardırop kurmuşsun.",
  "{era} rüzgarı estiren bir gardırobun var; {kelime1} ve {kelime2} detaylar imzan haline gelmiş. {butce} tercihlerinle tavrını netleştiriyorsun.",
  "Koleksiyonun {kelime1} ile {kelime2} arasında güçlü bir denge kuruyor. {era} etkiler hissediliyor; {butce} yaklaşımınla kararlı bir stil ortaya koymuşsun.",
  "{kelime1} ve {kelime2} parçalar gardırobunun bel kemiğini oluşturuyor. {era} dokunuşlarla harmanlanan bu seçim, {butce} bir stil kimliği yaratmış.",
  "Gardırobunda {era} izleri belirgin; {kelime1} ve {kelime2} ile şekillenen bu tarz, {butce} kararlarınla bütünlük kazanmış.",
];

const NOTE_POOL = [
  "Rahat ve şık bir başlangıç yap",
  "Katmanlı bir görünüm dene",
  "Aksesuarlarla detay kat",
  "Monokrom bir kombin kur",
  "Zıt dokuları bir arada kullan",
  "Klasik bir parçayla dengele",
  "Sade ama etkileyici bir seçim yap",
  "Renk kontrastıyla öne çık",
  "Rahatlık öncelikli bir gün geçir",
  "Dikkat çeken bir parçayı öne al",
  "Minimal bir siluet kur",
  "Kat kat giyinmeyi dene",
  "Retro bir dokunuş ekle",
  "Ayakkabı seçimini konuşturt",
  "Gün boyu şıklığını koru",
];

export type StyleProductInput = {
  id: number | string;
  title: string;
  price: number | null;
  era: string | null;
};

export type StyleOutfitInput = {
  id: number | string;
  title: string;
  era: string | null;
};

export type WeeklyCalendarDay = {
  day: string;
  product_ids: (number | string)[];
  note: string;
};

function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let t = seed;
  return function random() {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(list: T[], rng: () => number): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mostFrequent(values: (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    if (!v) return;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  });
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function budgetSegment(avgPrice: number | null): string | null {
  if (avgPrice === null) return null;
  if (avgPrice < 300) return "Bütçe Dostu";
  if (avgPrice <= 1000) return "Orta Segment";
  return "Premium";
}

function topKeywords(titles: string[], limit: number): string[] {
  const lowerTitles = titles.map((t) => t.toLowerCase());
  const counts = new Map<string, number>();

  KEYWORD_DICTIONARY.forEach((keyword) => {
    const count = lowerTitles.reduce((sum, t) => sum + (t.includes(keyword) ? 1 : 0), 0);
    if (count > 0) counts.set(keyword, count);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([keyword]) => keyword);
}

function ensureTwoKeywords(found: string[]): [string, string] {
  const result = [...found];
  for (const fallback of DEFAULT_KEYWORDS) {
    if (result.length >= 2) break;
    if (!result.includes(fallback)) result.push(fallback);
  }
  return [result[0], result[1]];
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-${weekNo}`;
}

export function buildStyleReport({
  userId,
  products,
  outfits,
}: {
  userId: string;
  products: StyleProductInput[];
  outfits: StyleOutfitInput[];
}): string {
  const eraRaw = mostFrequent([...products.map((p) => p.era), ...outfits.map((o) => o.era)]);
  const era = eraRaw ? getEraLabel(eraRaw) ?? "Güncel" : "Güncel";

  const prices = products
    .map((p) => p.price)
    .filter((p): p is number => typeof p === "number" && !Number.isNaN(p));
  const avgPrice = prices.length ? prices.reduce((sum, p) => sum + p, 0) / prices.length : null;
  const butce = budgetSegment(avgPrice) ?? "Kendine özgü";

  const titles = [...products.map((p) => p.title), ...outfits.map((o) => o.title)].filter(
    (t): t is string => !!t
  );
  const [kelime1, kelime2] = ensureTwoKeywords(topKeywords(titles, 2));

  const templateIndex = hashString(userId) % TEMPLATES.length;
  const template = TEMPLATES[templateIndex];

  return fillTemplate(template, { era, kelime1, kelime2, butce });
}

export function buildWeeklyCalendar({
  userId,
  products,
  userStyleTags = [],
  userBodyType = null,
  userSkinUndertone = null,
}: {
  userId: string;
  products: (EngineProduct | { id: number | string })[];
  userStyleTags?: string[];
  // Takvimin sahibi zaten bu kullanıcı — kendi vücut tipi/cilt alt tonu,
  // kendi haftalık planını sessizce kişiselleştirir.
  userBodyType?: BodyType | null;
  userSkinUndertone?: SkinUndertone | null;
}): WeeklyCalendarDay[] {
  const seed = hashString(`${userId}:${getISOWeekKey(new Date())}`);
  const rng = mulberry32(seed);
  const shuffled = shuffleWithRng(products, rng);

  // Deterministik (hafta + kullanıcı) sıradaki her ürünü gün ankrajı olarak
  // dener; motor o ankraj etrafında kullanıcının kendi gardırobundan skorlu
  // bir kombin kurabiliyorsa gün o kombinle dolar. Kategori verisi olmayan
  // gardıroplar için eski rastgele dağıtım geriye dönüş olarak korunur.
  const engineProducts = shuffled.filter(
    (p): p is EngineProduct => "category" in p && !!p.category
  );

  const days: WeeklyCalendarDay[] = [];
  const usedAnchorIds = new Set<number | string>();
  let prevDayIds: (number | string)[] = [];

  for (let dayIndex = 0; dayIndex < DAYS.length; dayIndex++) {
    const day = DAYS[dayIndex];
    let built: WeeklyCalendarDay | null = null;

    for (const anchor of engineProducts) {
      if (usedAnchorIds.has(anchor.id)) continue;
      if (anchor.is_sold) continue;

      const [best] = buildOutfitSuggestions({
        anchor,
        candidates: engineProducts,
        userStyleTags,
        userBodyType,
        userSkinUndertone,
        maxOutfits: 1,
        wardrobeMode: true,
      });
      if (!best) continue;

      usedAnchorIds.add(anchor.id);
      built = {
        day,
        product_ids: [anchor.id, ...best.items.map((i) => i.product.id)],
        note: best.explanation,
      };
      break;
    }

    if (built) {
      days.push(built);
      prevDayIds = built.product_ids;
      continue;
    }

    // Geriye dönüş: motor kombin kuramadıysa eski dağıtım mantığı.
    days.push(fallbackDay(shuffled, day, dayIndex, seed, prevDayIds));
    prevDayIds = days[days.length - 1].product_ids;
  }

  return days;
}

function fallbackDay(
  shuffled: { id: number | string }[],
  day: string,
  dayIndex: number,
  seed: number,
  prevDayIds: (number | string)[]
): WeeklyCalendarDay {
  const n = shuffled.length;
  const perDay = n === 0 ? 0 : n >= 8 ? 2 : 1;
  const ids: (number | string)[] = [];
  let cursor = dayIndex * perDay;

  for (let k = 0; k < perDay && n > 0; k++) {
    let attempts = 0;
    let candidate = shuffled[cursor % n];

    while (
      n > perDay &&
      attempts < n &&
      (prevDayIds.includes(candidate.id) || ids.includes(candidate.id))
    ) {
      cursor++;
      candidate = shuffled[cursor % n];
      attempts++;
    }

    ids.push(candidate.id);
    cursor++;
  }

  const note = NOTE_POOL[(dayIndex + seed) % NOTE_POOL.length];
  return { day, product_ids: ids, note };
}
