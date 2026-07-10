// Kategori bazlı statik çevre tasarrufu tahminleri — ikinci el alışverişin
// yeni üretime kıyasla önlediği yaklaşık su ve karbon maliyeti.
// Değerler sektör LCA raporlarından yaklaşık ortalamalardır; kesinlik
// iddiası taşımaz, "~" ile sunulur.

import type { Category } from "./categories";

export type SustainabilityEstimate = {
  waterLiters: number;
  co2Kg: number;
};

const ESTIMATES: Partial<Record<Category, SustainabilityEstimate>> = {
  ust_giyim: { waterLiters: 2700, co2Kg: 7 },
  alt_giyim: { waterLiters: 7500, co2Kg: 20 }, // denim ağırlıklı
  ayakkabi: { waterLiters: 4000, co2Kg: 14 },
  elbise: { waterLiters: 5500, co2Kg: 17 },
  dis_giyim: { waterLiters: 6000, co2Kg: 18 },
  canta: { waterLiters: 3000, co2Kg: 10 },
};

export function getSustainabilityEstimate(
  category: string | null | undefined
): SustainabilityEstimate | null {
  if (!category) return null;
  return ESTIMATES[category as Category] ?? null;
}

export function formatSustainabilityLine(estimate: SustainabilityEstimate): string {
  const water = estimate.waterLiters.toLocaleString("tr-TR");
  return `Bu parçayı ikinci el alarak ~${water} lt su ve ~${estimate.co2Kg} kg CO₂ tasarruf ediyorsun.`;
}
