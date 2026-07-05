export type ArticleCategory = "moda_haftasi" | "trend" | "stil_kilavuzu";

export const ARTICLE_CATEGORIES: { value: ArticleCategory; label: string }[] = [
  { value: "moda_haftasi", label: "Moda Haftası" },
  { value: "trend", label: "Trend" },
  { value: "stil_kilavuzu", label: "Stil Kılavuzu" },
];

export function getArticleCategoryLabel(value: string | null | undefined): string {
  return ARTICLE_CATEGORIES.find((c) => c.value === value)?.label ?? "Editoryal";
}
