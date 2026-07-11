// Akış sıralama yardımcıları — her akışta aynı kural çalışsın diye tek yerde.
//
// 1) Hibrit kota: her 5 karttan biri "taze ama görülmemiş" havuzundan gelir
//    (son 24 saat içinde paylaşılmış VE beğenisi 3'ün altında, en yeniden
//    başlayarak). Kalan 4 kart mevcut sıralamayla akar. Taze havuz boşsa
//    kota atlanır, sıralama aynen kalır.
//
// 2) Stil DNA lite: kullanıcının profil stil etiketleriyle eşleşen içerikler
//    listede öne çekilir (stabil — eşleşenler ve eşleşmeyenler kendi
//    aralarındaki sırayı korur). Etiket yoksa liste aynen döner.

export const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
export const FRESH_MAX_LIKES = 3;
export const QUOTA_INTERVAL = 5;

export function isFreshLowEngagement(
  createdAt: string | null | undefined,
  likeCount: number | null | undefined,
  now: number = Date.now()
): boolean {
  if (!createdAt) return false;
  const age = now - new Date(createdAt).getTime();
  if (!(age >= 0 && age < FRESH_WINDOW_MS)) return false;
  return (likeCount ?? 0) < FRESH_MAX_LIKES;
}

export function applyFreshQuota<T>(
  items: T[],
  options: {
    isFresh: (item: T) => boolean;
    getCreatedAt: (item: T) => string | null | undefined;
    interval?: number;
  }
): T[] {
  const interval = options.interval ?? QUOTA_INTERVAL;

  const fresh = items
    .filter(options.isFresh)
    .sort((a, b) => {
      const ta = new Date(options.getCreatedAt(a) ?? 0).getTime();
      const tb = new Date(options.getCreatedAt(b) ?? 0).getTime();
      return tb - ta;
    });

  if (fresh.length === 0) return items;

  const freshSet = new Set(fresh);
  const rest = items.filter((item) => !freshSet.has(item));

  const result: T[] = [];
  let restIndex = 0;
  let freshIndex = 0;

  while (restIndex < rest.length || freshIndex < fresh.length) {
    // Blok içinde son slot taze havuzdan; ilk (interval-1) slot mevcut sıra.
    const positionInBlock = result.length % interval;
    const quotaSlot = positionInBlock === interval - 1;

    if ((quotaSlot && freshIndex < fresh.length) || restIndex >= rest.length) {
      result.push(fresh[freshIndex++]);
    } else {
      result.push(rest[restIndex++]);
    }
  }

  return result;
}

// Merkezi engelleme filtresi: engellenen kullanıcıların içerikleri
// (ürün/kombin/gönderi/yorum) akışlarda gösterilmez. Sahibi bilinmeyen
// öğeler elenmez.
export function excludeBlocked<T>(
  items: T[],
  blockedIds: Set<string>,
  getUserId: (item: T) => string | null | undefined
): T[] {
  if (blockedIds.size === 0) return items;
  return items.filter((item) => {
    const uid = getUserId(item);
    return !uid || !blockedIds.has(uid);
  });
}

function normalizeTag(tag: string | null | undefined): string | null {
  return tag ? tag.trim().toLowerCase() : null;
}

export function boostByStyleDna<T>(
  items: T[],
  userStyleTags: string[],
  getStyleTag: (item: T) => string | null | undefined
): T[] {
  const tags = new Set(
    userStyleTags.map((t) => normalizeTag(t)).filter((t): t is string => !!t)
  );
  if (tags.size === 0) return items;

  const matched: T[] = [];
  const others: T[] = [];
  for (const item of items) {
    const tag = normalizeTag(getStyleTag(item));
    (tag && tags.has(tag) ? matched : others).push(item);
  }
  if (matched.length === 0) return items;

  return [...matched, ...others];
}

// Tipik kullanım: önce Stil DNA ile temel sıralamayı kişiselleştir, sonra
// taze içerik kotasını uygula (kota her koşulda garanti kalır).
export function mixFeed<T>(
  items: T[],
  options: {
    getCreatedAt: (item: T) => string | null | undefined;
    getLikeCount: (item: T) => number | null | undefined;
    getStyleTag?: (item: T) => string | null | undefined;
    userStyleTags?: string[];
    now?: number;
  }
): T[] {
  const now = options.now ?? Date.now();

  const personalized =
    options.getStyleTag && options.userStyleTags?.length
      ? boostByStyleDna(items, options.userStyleTags, options.getStyleTag)
      : items;

  return applyFreshQuota(personalized, {
    isFresh: (item) =>
      isFreshLowEngagement(options.getCreatedAt(item), options.getLikeCount(item), now),
    getCreatedAt: options.getCreatedAt,
  });
}
