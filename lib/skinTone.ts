// Cilt alt tonu sözlüğü — en hassas kişisel katman. Yalnızca kombin
// motorunun sessiz renk kişiselleştirmesinde kullanılır (bkz. outfit-engine).

export type SkinUndertone = "sicak" | "soguk" | "notr";

export const SKIN_UNDERTONES: SkinUndertone[] = ["sicak", "soguk", "notr"];

export const SKIN_UNDERTONE_LABELS: Record<SkinUndertone, string> = {
  sicak: "Sıcak Alt Ton",
  soguk: "Soğuk Alt Ton",
  notr: "Nötr",
};

export const SKIN_UNDERTONE_DESCRIPTIONS: Record<SkinUndertone, string> = {
  sicak: "Altın/şeftali yansımaları, damarların yeşilimsi görünmesi.",
  soguk: "Pembe/mavi yansımalar, damarların mavimsi görünmesi.",
  notr: "İkisi de biraz — hem sıcak hem soğuk tonlar uyumlu.",
};

export const SKIN_UNDERTONE_OPTIONS: { value: SkinUndertone; label: string; description: string }[] =
  SKIN_UNDERTONES.map((value) => ({
    value,
    label: SKIN_UNDERTONE_LABELS[value],
    description: SKIN_UNDERTONE_DESCRIPTIONS[value],
  }));

export const SKIN_UNDERTONE_HELP =
  "Emin değil misin? Bileğindeki damarların rengine bak: yeşilimsi görünüyorsa sıcak, mavimsi/morumsu görünüyorsa soğuk alt tonlu olabilirsin. Ayırt edemiyorsan muhtemelen nötrsün.";
