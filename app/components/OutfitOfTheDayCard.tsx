import Link from "next/link";
import Image from "next/image";

// "Bugünün Kombini" — outfit_of_the_day view'ından gelen, son 24 saatin en
// beğenilen kombini. Akış kartlarından belirgin farklı: tam genişlik, dergi
// kapağı hissinde bordo çizgili bölüm etiketi, büyük kullanıcı adı.
// compact: mobil ana sayfa tepesi için sıkıştırılmış versiyon.

export type OutfitOfTheDay = {
  id: number | string;
  title: string;
  image_url: string;
  username: string;
  like_count: number;
  style_tag?: string | null;
};

export default function OutfitOfTheDayCard({
  outfit,
  compact = false,
}: {
  outfit: OutfitOfTheDay;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Link
        href={`/outfit/${outfit.id}`}
        className="mb-6 flex items-center gap-4 border border-neutral-200 bg-surface p-3 group"
      >
        <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-neutral-100">
          <Image
            src={outfit.image_url}
            alt={outfit.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="section-label mb-1">★ Bugünün Kombini</p>
          <p className="font-serif text-lg text-ink truncate group-hover:text-accent transition-colors">
            @{outfit.username}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {outfit.like_count} beğeni ile günün birincisi
          </p>
        </div>
      </Link>
    );
  }

  return (
    <section className="mb-10 border border-neutral-200 bg-surface">
      <div className="border-b border-accent/40 px-6 pt-5 pb-4 md:px-10">
        <p className="section-label">★ Bugünün Kombini</p>
      </div>
      <Link
        href={`/outfit/${outfit.id}`}
        className="flex flex-col md:flex-row md:items-stretch group"
      >
        <div className="relative aspect-[3/4] w-full md:w-72 shrink-0 overflow-hidden bg-neutral-100">
          <Image
            src={outfit.image_url}
            alt={outfit.title}
            fill
            sizes="(min-width: 768px) 288px, 100vw"
            className="object-cover transition-transform duration-500 ease-out md:group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col justify-center gap-3 p-6 md:p-10">
          <h2 className="font-serif text-3xl md:text-4xl text-ink tracking-tight group-hover:text-accent transition-colors">
            @{outfit.username}
          </h2>
          <p className="text-sm text-gray-600 truncate">{outfit.title}</p>
          <p className="font-serif italic text-sm text-gray-600">
            {outfit.like_count} beğeni ile günün birincisi
            {outfit.style_tag ? ` — ${outfit.style_tag} yorumuyla` : ""}.
          </p>
          <span className="mt-2 text-xs uppercase tracking-widest text-accent">
            Kombini incele →
          </span>
        </div>
      </Link>
    </section>
  );
}
