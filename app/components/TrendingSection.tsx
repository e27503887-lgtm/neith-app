import Link from "next/link";
import TrendingCard, { type TrendingItem } from "./TrendingCard";

export default function TrendingSection({ items }: { items: TrendingItem[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Şu Anda Moda</h3>
        <Link
          href="/popular?tab=trending"
          className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
        >
          Tümünü gör →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {items.map((item) => (
          <div key={`${item.kind}-${item.id}`} className="w-[78vw] sm:w-48 shrink-0 snap-start">
            <TrendingCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
