// Ürün fotoğrafından dominant rengi tarayıcıda hesaplar (canvas).
// Merkez ağırlıklı örnekleme: kenar pikselleri (genelde zemin/arka plan)
// dışlanır, merkeze yakın pikseller daha yüksek ağırlık alır. Piksel
// renkleri kaba kovalara (4 bit/kanal) toplanır; en ağır kovanın
// ağırlıklı ortalaması dominant renk kabul edilir.

import { rgbToHex } from "@/lib/colors";

const SAMPLE_SIZE = 64;
const EDGE_RATIO = 0.18; // dış %18'lik çerçeve tamamen dışlanır

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

// Hata durumunda null döner — çağıran taraf renk alanını boş bırakır,
// yükleme akışı asla bloklanmaz.
export async function extractDominantColor(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  try {
    const img = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

    const edge = Math.floor(SAMPLE_SIZE * EDGE_RATIO);
    const center = (SAMPLE_SIZE - 1) / 2;
    const maxDist = center - edge;

    // kova anahtarı → { ağırlık, ağırlıklı r/g/b toplamları }
    const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();

    for (let y = edge; y < SAMPLE_SIZE - edge; y++) {
      for (let x = edge; x < SAMPLE_SIZE - edge; x++) {
        const i = (y * SAMPLE_SIZE + x) * 4;
        const a = data[i + 3];
        if (a < 128) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const dist = Math.hypot(x - center, y - center);
        const weight = Math.max(0.05, 1 - dist / (maxDist || 1));

        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const bucket = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
        bucket.w += weight;
        bucket.r += r * weight;
        bucket.g += g * weight;
        bucket.b += b * weight;
        buckets.set(key, bucket);
      }
    }

    let best: { w: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.w > best.w) best = bucket;
    }
    if (!best || best.w === 0) return null;

    return rgbToHex(best.r / best.w, best.g / best.w, best.b / best.w);
  } catch {
    return null;
  }
}
