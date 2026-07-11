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
      ? "border border-neutral-200 bg-surface/90 text-ink"
      : "border border-neutral-200 bg-surface text-gray-600";

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {badgeKeys.map((key) => {
        const badge = getBadgeInfo(key);
        if (!badge) return null;
        const Icon = badge.icon;

        return (
          <span
            key={key}
            className={`relative group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${chipClass}`}
            aria-label={badge.description}
            title={badge.description}
          >
            <Icon size={14} strokeWidth={1.5} className="text-accent shrink-0" />
            {badge.label}
            <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-max -translate-x-1/2 rounded-2xl border border-neutral-200 bg-surface px-3 py-2 text-xs text-gray-600 shadow-lg group-hover:block">
              {badge.description}
            </span>
          </span>
        );
      })}
    </div>
  );
}
