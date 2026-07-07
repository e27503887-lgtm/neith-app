import { getBadgeInfo } from "@/lib/badges";

export default function BadgeChips({
  badgeKeys,
  variant = "light",
}: {
  badgeKeys: string[];
  variant?: "light" | "dark";
}) {
  if (badgeKeys.length === 0) return null;

  const chipClass =
    variant === "dark"
      ? "border border-neutral-200 bg-paper/90 text-ink"
      : "border border-neutral-200 text-gray-600";

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {badgeKeys.map((key) => {
        const badge = getBadgeInfo(key);
        if (!badge) return null;
        const Icon = badge.icon;

        return (
          <span
            key={key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-wide ${chipClass}`}
          >
            <Icon size={11} strokeWidth={1.5} />
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
