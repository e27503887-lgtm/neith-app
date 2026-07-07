import { Mail, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BadgeKey = "davetci" | "kurucu_uye";

export const BADGES: Record<BadgeKey, { label: string; icon: LucideIcon }> = {
  davetci: { label: "Davetçi", icon: Mail },
  kurucu_uye: { label: "Kurucu Üye", icon: Sparkles },
};

export function getBadgeInfo(key: string): { label: string; icon: LucideIcon } | null {
  return Object.prototype.hasOwnProperty.call(BADGES, key) ? BADGES[key as BadgeKey] : null;
}
