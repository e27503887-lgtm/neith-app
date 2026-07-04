import Link from "next/link";
import Image from "next/image";
import BrandBadge from "./BrandBadge";

type Outfit = {
  id: number | string;
  title: string;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
};

export default function OutfitCard({ outfit }: { outfit: Outfit }) {
  return (
    <article className="bg-paper border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${outfit.username}`} className="shrink-0">
          {outfit.avatar_url ? (
            <Image
              src={outfit.avatar_url}
              alt={outfit.username}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {outfit.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <Link
          href={`/profile/${outfit.username}`}
          className="flex items-center gap-1 text-xs uppercase tracking-wide font-medium hover:text-accent transition-colors"
        >
          @{outfit.username}
          {outfit.account_type === "brand" && <BrandBadge />}
        </Link>
      </div>

      <Link
        href={`/outfit/${outfit.id}`}
        className="relative block w-full aspect-[3/4] overflow-hidden"
      >
        <span className="absolute top-2 left-2 z-10 bg-paper/90 text-accent text-xs uppercase tracking-wide font-medium px-2 py-1">
          Kombin
        </span>
        <Image
          src={outfit.image_url}
          alt={outfit.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 ease-out hover:scale-105"
        />
      </Link>

      <div className="px-3 pt-2">
        <h2 className="text-sm truncate">{outfit.title}</h2>
      </div>

      <div className="p-3">
        <Link href={`/outfit/${outfit.id}`} className="btn-primary w-full">
          Shop the Outfit
        </Link>
      </div>
    </article>
  );
}
