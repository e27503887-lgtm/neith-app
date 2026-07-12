// Stil sözlüğü — kombin motorunun ve seçici arayüzlerin tek doğruluk
// kaynağı. Saklanan/karşılaştırılan değer her zaman Türkçe görünen ad
// (ör. "Old Money") olur — mevcut DB verisiyle (products/outfits.style_tag)
// tam uyumlu, geriye dönük taşıma gerekmez. Slug'lar yalnızca bu dosya ve
// lib/style-compatibility.ts içinde tanımlayıcı anahtar olarak kullanılır.

export type StyleSlug =
  | "minimalist"
  | "vintage"
  | "streetwear"
  | "y2k"
  | "grunge"
  | "sporty"
  | "old_money"
  | "oversize"
  | "blokecore"
  | "quiet_luxury"
  | "techwear"
  | "darkwear"
  | "gorpcore"
  | "avant_garde"
  | "boho_chic"
  | "preppy"
  | "parisian"
  | "scandinavian"
  | "dark_academia";

export const STYLE_LABELS: Record<StyleSlug, string> = {
  minimalist: "Minimalist",
  vintage: "Vintage",
  streetwear: "Streetwear",
  y2k: "Y2K",
  grunge: "Grunge",
  sporty: "Sporty",
  old_money: "Old Money",
  oversize: "Oversize",
  blokecore: "Blokecore",
  quiet_luxury: "Sessiz Lüks",
  techwear: "Techwear",
  darkwear: "Darkwear",
  gorpcore: "Gorpcore",
  avant_garde: "Avangard",
  boho_chic: "Bohem Şıklık",
  preppy: "Preppy",
  parisian: "Parizyen",
  scandinavian: "İskandinav",
  dark_academia: "Karanlık Akademi",
};

export const STYLE_SLUGS = Object.keys(STYLE_LABELS) as StyleSlug[];

// Seçici bileşenlerin (chip listeleri) doğrudan kullandığı Türkçe ad
// dizisi — mevcut arayüz tasarımı bu string dizisi üzerinden çalışıyor.
export const STYLE_TAGS = STYLE_SLUGS.map((slug) => STYLE_LABELS[slug]);

export type StyleTag = (typeof STYLE_TAGS)[number];

// Türkçe'de "İ" harfinin standart toLowerCase() ile yanlış dönüşmesini
// (İ → i̇, iki karakter) önlemek için tr-TR yerel ayarıyla küçük harfe
// çevrilir. Tüm stil karşılaştırmaları bu fonksiyon üzerinden yapılmalı.
export function normalizeStyleLabel(label: string | null | undefined): string | null {
  return label ? label.trim().toLocaleLowerCase("tr-TR") : null;
}

const LABEL_TO_SLUG = new Map<string, StyleSlug>(
  STYLE_SLUGS.map((slug) => [normalizeStyleLabel(STYLE_LABELS[slug])!, slug])
);

// Depolanan/görüntülenen Türkçe etiketten (case-insensitive) slug'a döner;
// tanınmayan bir değer (eski/serbest metin) için null.
export function getStyleSlug(label: string | null | undefined): StyleSlug | null {
  const key = normalizeStyleLabel(label);
  return key ? (LABEL_TO_SLUG.get(key) ?? null) : null;
}
