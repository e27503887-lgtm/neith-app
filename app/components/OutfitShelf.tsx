import Link from "next/link";
import Image from "next/image";

type ShelfOutfit = {
  id: number | string;
  title: string;
  image_url: string;
};

export default function OutfitShelf({ outfits }: { outfits: ShelfOutfit[] }) {
  if (outfits.length === 0) return null;

  return (
    <section className="py-8 border-b border-neutral-200 last:border-none">
      <h2 className="font-serif text-xl text-ink tracking-tight mb-4">Kombinler</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {outfits.map((outfit) => (
          <Link
            key={outfit.id}
            href={`/outfit/${outfit.id}`}
            className="group shrink-0 w-48 border border-neutral-200 hover:border-accent transition-colors"
          >
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-50">
              <Image
                src={outfit.image_url}
                alt={outfit.title}
                fill
                sizes="192px"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
            <p className="p-3 font-serif italic text-ink text-sm truncate">{outfit.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
