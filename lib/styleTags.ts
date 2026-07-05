export const STYLE_TAGS = [
  "Blokecore",
  "Minimalist",
  "Vintage",
  "Vintage Kargo",
  "Oversize",
  "Old Money",
  "Y2K",
  "Streetwear",
  "Grunge",
  "Sporty",
] as const;

export type StyleTag = (typeof STYLE_TAGS)[number];
