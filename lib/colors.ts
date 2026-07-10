// Renk yardımcıları — saf TS, tarayıcı API'si yok.
// Ürün fotoğrafından çıkarılan dominant hex rengi dört gruba indirger:
// notr / sicak / soguk / canli. Kombin motoru bu grupları puanlar.

export type ColorGroup = "notr" | "sicak" | "soguk" | "canli";

export type PresetColor = {
  hex: string;
  label: string;
  group: ColorGroup;
};

// /sell formundaki düzeltme paleti — kullanıcı otomatik tespiti beğenmezse
// bu 8 renkten birine dokunarak düzeltir.
export const PRESET_COLORS: PresetColor[] = [
  { hex: "#1c1c1c", label: "Siyah", group: "notr" },
  { hex: "#f4f1ea", label: "Beyaz", group: "notr" },
  { hex: "#8a8a8a", label: "Gri", group: "notr" },
  { hex: "#cbb994", label: "Bej", group: "notr" },
  { hex: "#6b4a2f", label: "Kahverengi", group: "sicak" },
  { hex: "#b3382c", label: "Kırmızı", group: "canli" },
  { hex: "#31548c", label: "Mavi", group: "soguk" },
  { hex: "#3e6b52", label: "Yeşil", group: "soguk" },
];

export const COLOR_GROUP_LABELS: Record<ColorGroup, string> = {
  notr: "Nötr",
  sicak: "Sıcak ton",
  soguk: "Soğuk ton",
  canli: "Canlı",
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

export function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s, l };
}

// Hex → renk grubu. Sıra önemli: önce nötr (düşük doygunluk ya da uç
// parlaklık), sonra canlı (yüksek doygunluk + orta parlaklık), kalan
// renkler ton açısına göre sıcak/soğuk.
export function deriveColorGroup(hex: string): ColorGroup | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  if (s < 0.16 || l < 0.12 || l > 0.92) return "notr";
  if (s >= 0.55 && l >= 0.3 && l <= 0.72) return "canli";
  // Kırmızı-turuncu-sarı yayı sıcak; yeşil-mavi-mor yayı soğuk.
  if (h < 75 || h >= 330) return "sicak";
  return "soguk";
}
