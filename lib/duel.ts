// Kombin Düellosu yardımcıları — saf TS.
// Eşleştirme kuralları: aynı stil etiketinden iki AKTİF kombin, farklı
// kullanıcılardan; oylayanın kendi kombini havuza girmez. Kayıt öncesi
// çift normalize edilir (küçük id = outfit_a) ki aynı ikili tek satırda
// birleşsin ve unique kısıtı çalışsın. Elo hesaplaması tamamen DB
// tetikleyicisinde (update_elo_ratings) yapılır — burada yalnızca
// SONUÇLARI (elo_rating) adil eşleştirme için okunur.

export type DuelOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  user_id: string | null;
  elo_rating?: number | null;
  // Kör oylama: yalnızca oy verildikten SONRA gösterilir (bkz. OutfitDuelCard).
  username?: string | null;
  avatar_url?: string | null;
};

const DEFAULT_ELO = 1200;
// "Rastgele bir kombin seç, ona en yakın elo'lu 5-10 kombinden birini
// rastgele eşleştir" — adil eşleşme için yakınlık havuzunun boyutu.
const CLOSE_ELO_POOL_SIZE = 8;

export type DuelPair = { a: DuelOutfit; b: DuelOutfit };

function idLess(x: number | string, y: number | string): boolean {
  const nx = Number(x);
  const ny = Number(y);
  if (Number.isFinite(nx) && Number.isFinite(ny)) return nx < ny;
  return String(x) < String(y);
}

export function normalizePair(x: DuelOutfit, y: DuelOutfit): DuelPair {
  return idLess(x.id, y.id) ? { a: x, b: y } : { a: y, b: x };
}

export function pairKey(x: number | string, y: number | string): string {
  return idLess(x, y) ? `${x}|${y}` : `${y}|${x}`;
}

export function pickDuelPair(
  pool: DuelOutfit[],
  options: {
    excludeUserId?: string | null;
    excludePairs?: Set<string>;
    random?: () => number;
  } = {}
): DuelPair | null {
  const random = options.random ?? Math.random;
  const eligible = pool.filter(
    (o) =>
      !!o.style_tag &&
      !!o.image_url &&
      (!options.excludeUserId || o.user_id !== options.excludeUserId)
  );

  // stil → kombinler
  const byStyle = new Map<string, DuelOutfit[]>();
  for (const outfit of eligible) {
    const key = outfit.style_tag!;
    const list = byStyle.get(key) ?? [];
    list.push(outfit);
    byStyle.set(key, list);
  }

  // Farklı kullanıcılardan en az iki kombini olan stiller aday.
  const candidateStyles = [...byStyle.entries()].filter(
    ([, list]) => new Set(list.map((o) => o.user_id)).size >= 2
  );
  if (candidateStyles.length === 0) return null;

  // Rastgele stil sırasıyla dene; tükenmeyen ilk geçerli çifti döndür.
  const shuffledStyles = [...candidateStyles].sort(() => random() - 0.5);
  for (const [, list] of shuffledStyles) {
    // Adil eşleşme: rastgele bir "çekirdek" kombin seç, elo_rating'i ona en
    // yakın olan CLOSE_ELO_POOL_SIZE adaydan birini rastgele eşleştir.
    // Çekirdek uygun bir rakip bulamazsa (hepsi dışlanmışsa) sıradaki
    // çekirdeğe geçilir — tamamen rastgele seçime düşülmez.
    const seeds = [...list].sort(() => random() - 0.5);
    for (const seed of seeds) {
      const seedElo = seed.elo_rating ?? DEFAULT_ELO;

      const closeOpponents = list
        .filter((o) => o.id !== seed.id && o.user_id !== seed.user_id)
        .sort((a, b) => {
          const da = Math.abs((a.elo_rating ?? DEFAULT_ELO) - seedElo);
          const db = Math.abs((b.elo_rating ?? DEFAULT_ELO) - seedElo);
          return da - db;
        })
        .slice(0, CLOSE_ELO_POOL_SIZE)
        .filter((o) => !options.excludePairs?.has(pairKey(seed.id, o.id)));

      if (closeOpponents.length === 0) continue;

      const opponent = closeOpponents[Math.floor(random() * closeOpponents.length)];
      return normalizePair(seed, opponent);
    }
  }
  return null;
}
