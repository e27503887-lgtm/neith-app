import {
  Crown,
  Grid,
  HandCoins,
  Mail,
  Shirt,
  Sparkles,
  Star,
  Tag,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BadgeKey =
  | "ilk_ilan"
  | "ilk_kombin"
  | "ilk_satis"
  | "populer_satici"
  | "stil_ikonu"
  | "koleksiyoncu"
  | "davetci"
  | "kurucu_uye"
  | "moda_haftasi_kazanani";

export const BADGES: Record<BadgeKey, { label: string; icon: LucideIcon; description: string }> = {
  ilk_ilan: {
    label: "İlk İlan",
    description: "İlk ilanını ver",
    icon: Tag,
  },
  ilk_kombin: {
    label: "İlk Kombin",
    description: "İlk kombinini paylaş",
    icon: Shirt,
  },
  ilk_satis: {
    label: "İlk Satış",
    description: "İlk ürününü sat",
    icon: HandCoins,
  },
  populer_satici: {
    label: "Popüler Satıcı",
    description: "Kullanıcılar seni sıkça tercih ediyor",
    icon: Star,
  },
  stil_ikonu: {
    label: "Stil İkonu",
    description: "Stil ikonu olarak öne çık",
    icon: Sparkles,
  },
  koleksiyoncu: {
    label: "Koleksiyoncu",
    description: "Birden fazla tema koleksiyonu biriktir",
    icon: Grid,
  },
  davetci: {
    label: "Davetçi",
    description: "Bir arkadaşını davet et",
    icon: Mail,
  },
  kurucu_uye: {
    label: "Kurucu Üye",
    description: "Topluluğun ilk üyelerinden biri ol",
    icon: Crown,
  },
  moda_haftasi_kazanani: {
    label: "Moda Haftası Kazananı",
    description: "Moda Haftası’nda ödül kazan",
    icon: Trophy,
  },
};

export function getBadgeInfo(key: string): { label: string; icon: LucideIcon; description: string } | null {
  return Object.prototype.hasOwnProperty.call(BADGES, key)
    ? BADGES[key as BadgeKey]
    : null;
}
