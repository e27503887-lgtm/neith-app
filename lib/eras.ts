export type Era = "60lar" | "70ler" | "80ler" | "90lar" | "y2k" | "2010lar" | "guncel";

export type EraInfo = {
  value: Era;
  label: string;
  description: string;
};

export const ERAS: EraInfo[] = [
  {
    value: "60lar",
    label: "60'lar",
    description: "Mod kesimler, parlak renkler ve gençlik devriminin özgürlüğü.",
  },
  {
    value: "70ler",
    label: "70'ler",
    description: "Bol paça pantolonlar, disko parıltısı ve bohem ruh.",
  },
  {
    value: "80ler",
    label: "80'ler",
    description: "Vatkalı omuzlar, neon tonlar ve cesur bir maksimalizm.",
  },
  {
    value: "90lar",
    label: "90'lar",
    description: "Grunge, oversize denim ve minimalizmin doğuşu.",
  },
  {
    value: "y2k",
    label: "Y2K",
    description: "Parlak kumaşlar, düşük beller ve milenyum iyimserliği.",
  },
  {
    value: "2010lar",
    label: "2010'lar",
    description: "Normcore, katmanlı stiller ve sokak modasının yükselişi.",
  },
  {
    value: "guncel",
    label: "Güncel",
    description: "Şimdinin sokakları, bugünün silüetleri.",
  },
];

export function getEraInfo(value: string | null | undefined): EraInfo | null {
  if (!value) return null;
  return ERAS.find((e) => e.value === value) ?? null;
}

export function getEraLabel(value: string | null | undefined): string | null {
  return getEraInfo(value)?.label ?? null;
}
