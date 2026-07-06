export type Category =
  | "ust_giyim"
  | "alt_giyim"
  | "elbise"
  | "ayakkabi"
  | "canta"
  | "aksesuar"
  | "dis_giyim"
  | "diger";

export type CategoryInfo = {
  value: Category;
  label: string;
};

export const CATEGORIES: CategoryInfo[] = [
  { value: "ust_giyim", label: "Üst Giyim" },
  { value: "alt_giyim", label: "Alt Giyim" },
  { value: "elbise", label: "Elbise" },
  { value: "ayakkabi", label: "Ayakkabı" },
  { value: "canta", label: "Çanta" },
  { value: "aksesuar", label: "Aksesuar" },
  { value: "dis_giyim", label: "Dış Giyim" },
  { value: "diger", label: "Diğer" },
];

export function getCategoryInfo(value: string | null | undefined): CategoryInfo | null {
  if (!value) return null;
  return CATEGORIES.find((c) => c.value === value) ?? null;
}

export function getCategoryLabel(value: string | null | undefined): string | null {
  return getCategoryInfo(value)?.label ?? null;
}
