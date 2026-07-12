// Kumaş sözlüğü — kombin motorunun katmanlama kuralları bu ağırlık
// sınıflarını okur. Kullanıcıdan toplanmaz, sabit bir eşleme.

export type Fabric =
  | "ipek"
  | "keten"
  | "pamuk"
  | "yun"
  | "deri"
  | "denim"
  | "sentetik"
  | "triko"
  | "kadife"
  | "diger";

export type FabricWeight = "hafif" | "orta" | "orta-agir" | "agir";

export const FABRIC_LABELS: Record<Fabric, string> = {
  ipek: "İpek",
  keten: "Keten",
  pamuk: "Pamuk",
  yun: "Yün",
  deri: "Deri",
  denim: "Denim",
  sentetik: "Sentetik",
  triko: "Triko",
  kadife: "Kadife",
  diger: "Diğer",
};

export const FABRIC_WEIGHTS: Record<Fabric, FabricWeight> = {
  ipek: "hafif",
  keten: "hafif",
  pamuk: "orta",
  sentetik: "orta",
  triko: "orta-agir",
  denim: "agir",
  yun: "agir",
  kadife: "agir",
  deri: "agir",
  diger: "orta",
};

export const FABRICS: Fabric[] = Object.keys(FABRIC_LABELS) as Fabric[];

export const FABRIC_OPTIONS: { value: Fabric; label: string }[] = FABRICS.map((value) => ({
  value,
  label: FABRIC_LABELS[value],
}));

// Ağırlık sınıflarının sıralı skalası — katmanlama kıyaslamalarında kullanılır.
const WEIGHT_ORDER: Record<FabricWeight, number> = {
  hafif: 0,
  orta: 1,
  "orta-agir": 2,
  agir: 3,
};

export function getFabricWeight(fabric: string | null | undefined): FabricWeight | null {
  if (!fabric) return null;
  return FABRIC_WEIGHTS[fabric as Fabric] ?? null;
}

export function getFabricLabel(fabric: string | null | undefined): string | null {
  if (!fabric) return null;
  return FABRIC_LABELS[fabric as Fabric] ?? null;
}

// weightA'nın weightB'ye göre kıyası: pozitif = A daha ağır, 0 = eşit,
// negatif = A daha hafif.
export function compareFabricWeight(a: FabricWeight, b: FabricWeight): number {
  return WEIGHT_ORDER[a] - WEIGHT_ORDER[b];
}
