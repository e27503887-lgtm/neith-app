export type StyleRule = {
  tag: string;
  pairKeyword: string;
  hint: string;
};

// Local, deterministic style-matching rules — used instead of an LLM call so
// the Stil Asistanı / Kapsül Dolap features never depend on an API key.
export const STYLE_RULES: StyleRule[] = [
  { tag: "Blokecore", pairKeyword: "Vintage Kargo", hint: "retro ve spor bir hava yakala" },
  { tag: "Minimalist", pairKeyword: "Tailored Trousers", hint: "sade ve keskin bir siluet kur" },
  { tag: "Vintage", pairKeyword: "Denim", hint: "nostaljik bir dokunuş kat" },
  { tag: "Oversize", pairKeyword: "Blazer", hint: "rahat ama duruşlu bir görünüm yakala" },
  { tag: "Old Money", pairKeyword: "Structured Blazer", hint: "zamansız bir şıklık kur" },
  { tag: "Y2K", pairKeyword: "Crop", hint: "2000'lerin enerjisini taşı" },
  { tag: "Streetwear", pairKeyword: "Hoodie", hint: "rahat bir sokak stili kur" },
  { tag: "Grunge", pairKeyword: "Flanel", hint: "dağınık ama havalı bir görünüm yakala" },
  { tag: "Sporty", pairKeyword: "Track", hint: "aktif ve enerjik bir gün geçir" },
  { tag: "Vintage Kargo", pairKeyword: "Crop", hint: "2000'lerin nostaljisini modern bir dokunuşla birleştir" },
];
