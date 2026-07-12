// Vücut tipi sözlüğü — yalnızca kombin motorunun kişisel silüet katmanında
// kullanılır. Nötr, yargısız tariflerle: ölçü ilişkisini anlatır, "ideal"
// ya da "sorun" dili kullanmaz.

export type BodyType = "kum_saati" | "armut" | "ters_ucgen" | "dikdortgen";

export const BODY_TYPES: BodyType[] = ["kum_saati", "armut", "ters_ucgen", "dikdortgen"];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  kum_saati: "Kum Saati",
  armut: "Armut",
  ters_ucgen: "Ters Üçgen",
  dikdortgen: "Dikdörtgen",
};

export const BODY_TYPE_DESCRIPTIONS: Record<BodyType, string> = {
  kum_saati: "Omuz ve kalça dengeli, bel ince.",
  armut: "Kalça, omuzdan biraz daha belirgin.",
  ters_ucgen: "Omuzlar, kalçadan daha belirgin.",
  dikdortgen: "Omuz, bel ve kalça ölçüleri birbirine yakın.",
};

export const BODY_TYPE_OPTIONS: { value: BodyType; label: string; description: string }[] =
  BODY_TYPES.map((value) => ({
    value,
    label: BODY_TYPE_LABELS[value],
    description: BODY_TYPE_DESCRIPTIONS[value],
  }));
