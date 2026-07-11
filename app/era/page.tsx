import Link from "next/link";
import Image from "next/image";
import { ERAS } from "@/lib/eras";
import { supabase } from "../utils/supabase";

// Liste build anında donmasın: en fazla 60 sn eski veriyle sunulur (ISR).
export const revalidate = 60;

export default async function EraIndexPage() {
  const [{ data: products }, { data: outfits }] = await Promise.all([
    supabase
      .from("products")
      .select("era, image_url, created_at")
      .or("is_sold.is.null,is_sold.eq.false")
      .order("created_at", { ascending: false }),
    supabase.from("outfits").select("era, created_at"),
  ]);

  const cards = ERAS.map((era) => {
    const eraProducts = (products ?? []).filter((p) => p.era === era.value);
    const eraOutfitsCount = (outfits ?? []).filter((o) => o.era === era.value).length;

    return {
      ...era,
      count: eraProducts.length + eraOutfitsCount,
      coverImage: eraProducts[0]?.image_url ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink">
            Yıllara Göre Moda
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Her onyılın kendine has bir tavrı var — arşivde gezin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.value}
              href={`/era/${card.value}`}
              className="group relative block aspect-[4/3] overflow-hidden border border-neutral-200"
            >
              {card.coverImage ? (
                <Image
                  src={card.coverImage}
                  alt={card.label}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-200" />
              )}
              <div className="absolute inset-0 bg-ink/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                <h2 className="font-serif text-3xl text-white">{card.label}</h2>
                <p className="text-white/80 text-xs uppercase tracking-wide mt-2">
                  {card.count} içerik
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
