import Link from "next/link";
import Image from "next/image";
import ProductCard from "./components/ProductCard";
import { supabase } from "./utils/supabase";

export default async function Home() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const usernames = [...new Set((products ?? []).map((p) => p.username))];

  const { data: profiles } = usernames.length
    ? await supabase.from("profiles").select("username, avatar_url").in("username", usernames)
    : { data: [] as { username: string; avatar_url: string | null }[] };

  const avatarByUsername = new Map((profiles ?? []).map((p) => [p.username, p.avatar_url]));

  const productIds = (products ?? []).map((p) => p.id);
  const { data: commentRows } = productIds.length
    ? await supabase.from("comments").select("product_id").in("product_id", productIds)
    : { data: [] as { product_id: number | string }[] };

  const commentCountByProduct = new Map<number | string, number>();
  (commentRows ?? []).forEach((c) => {
    commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
  });

  const feed = (products ?? []).map((product) => ({
    ...product,
    avatar_url: avatarByUsername.get(product.username) ?? null,
    comment_count: commentCountByProduct.get(product.id) ?? 0,
  }));

  const newArrivals = feed.slice(0, 4);

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto flex items-start gap-8">
        <div className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sizin İçin Seçilenler</h1>
            <p className="text-gray-500 text-sm mt-1">En yeni kombinleri ve parçaları keşfedin.</p>
          </div>

          {feed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
              <p className="text-gray-500">Henüz ilan yok. İlk kombini sen paylaş!</p>
              <Link
                href="/sell"
                className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
              >
                İlan Ver
              </Link>
            </div>
          )}
        </div>

        {newArrivals.length > 0 && (
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24">
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <h2 className="text-sm font-semibold tracking-tight mb-3">Yeni Gelenler</h2>
              <div className="flex flex-col gap-3">
                {newArrivals.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-md -mx-1 p-1"
                  >
                    <div className="relative w-12 h-12 shrink-0 rounded-md overflow-hidden">
                      <Image
                        src={product.image_url}
                        alt={product.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">
                        {product.price.toLocaleString("tr-TR")} ₺
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* İlan Ekle Butonu */}
      <a href="/sell" className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform z-50">
        + İlan Ekle
      </a>

    </main>
  );
}
