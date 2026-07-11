import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../utils/supabase";

type Props = {
  params: Promise<{ brandName: string }>;
};

export default async function BrandDetailPage({ params }: Props) {
  const { brandName } = await params;

  const { data: brand } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("username", brandName)
    .eq("account_type", "brand")
    .maybeSingle();

  if (!brand) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-neutral-500">Marka bulunamadı.</p>
      </main>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, image_url")
    .or("is_sold.is.null,is_sold.eq.false")
    .eq("user_id", brand.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center mb-20 border-b border-neutral-200 pb-16">
          <div className="relative w-24 h-24 mb-6 overflow-hidden bg-neutral-100 border border-neutral-200">
            {brand.avatar_url ? (
              <Image
                src={brand.avatar_url}
                alt={brand.username}
                fill
                className="object-cover grayscale"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-neutral-400">
                {brand.username?.[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink mb-4">
            {brand.username}
          </h1>

          <p className="text-neutral-500 text-sm max-w-md leading-6">
            {brand.bio || "Zamansız çizgiler, sade bir estetik."}
          </p>
        </div>

        {!products || products.length === 0 ? (
          <p className="text-neutral-500 text-sm text-center">Bu markanın henüz ürünü yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-16">
            {products.map((p) => (
              <div key={p.id}>
                <Link
                  href={`/product/${p.id}`}
                  className="group relative block aspect-[3/4] overflow-hidden bg-neutral-100"
                >
                  <Image
                    src={p.image_url}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover grayscale transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors duration-300 group-hover:bg-ink/50">
                    <div className="text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <p className="font-serif text-xl text-white mb-2">
                        {p.price.toLocaleString("tr-TR")} ₺
                      </p>
                      <span className="text-[11px] uppercase tracking-[0.24em] text-white underline underline-offset-4">
                        Satın Al
                      </span>
                    </div>
                  </div>
                </Link>
                <p className="mt-3 text-center text-xs text-neutral-500 truncate">{p.title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
