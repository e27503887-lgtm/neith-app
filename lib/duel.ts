// Kombin Düellosu yardımcıları — saf TS.
// Eşleştirme kuralları: aynı stil etiketinden iki AKTİF kombin, farklı
// kullanıcılardan; oylayanın kendi kombini havuza girmez. Kayıt öncesi
// çift normalize edilir (küçük id = outfit_a) ki aynı ikili tek satırda
// birleşsin ve unique kısıtı çalışsın.

export type DuelOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  user_id: string | null;
};

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
    const shuffled = [...list].sort(() => random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        const x = shuffled[i];
        const y = shuffled[j];
        if (x.user_id === y.user_id) continue;
        if (options.excludePairs?.has(pairKey(x.id, y.id))) continue;
        return normalizePair(x, y);
      }
    }
  }
  return null;
}
