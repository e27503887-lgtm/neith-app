import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";

export default async function BrandsPage() {
  const { data: brandProfiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .eq("account_type", "brand")
    .order("username", { ascending: true });

  const brandIds = (brandProfiles ?? []).map((b) => b.id);

  const { data: productRows } = brandIds.length
    ? await supabase
        .from("products")
        .select("user_id, image_url, created_at")
        .in("user_id", brandIds)
        .order("created_at", { ascending: false })
    : { data: [] as { user_id: string; image_url: string }[] };

  const coverByBrand = new Map<string, string>();
  (productRows ?? []).forEach((p) => {
    if (!coverByBrand.has(p.user_id)) coverByBrand.set(p.user_id, p.image_url);
  });

  const brands = (brandProfiles ?? []).map((b) => ({
    ...b,
    cover: coverByBrand.get(b.id) ?? b.avatar_url,
  }));

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 border-b border-neutral-200 pb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-2">Marka Vitrini</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">Markalar</h1>
        </div>

        {brands.length === 0 ? (
          <p className="text-neutral-500 text-sm">Henüz vitrine çıkan bir marka yok.</p>
        ) : (
          <div className="flex flex-col gap-16">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.username}`}
                className="group relative block w-full aspect-[16/7] overflow-hidden bg-neutral-100"
              >
                {brand.cover ? (
                  <Image
                    src={brand.cover}
                    alt={brand.username}
                    fill
                    sizes="(min-width: 1024px) 960px, 100vw"
                    className="object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-neutral-200" />
                )}
                <div className="absolute inset-0 bg-ink/35 transition-colors duration-500 group-hover:bg-ink/45" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <h2 className="font-serif text-4xl md:text-5xl text-paper tracking-tight">
                    {brand.username}
                  </h2>
                  <span className="mt-3 text-[11px] uppercase tracking-[0.24em] text-paper/70">
                    Markayı Keşfet
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
