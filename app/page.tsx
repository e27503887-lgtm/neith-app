import Link from "next/link";
import ProductCard from "./components/ProductCard";
import { supabase } from "./utils/supabase";

export default async function Home() {
  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sizin İçin Seçilenler</h1>
          <p className="text-gray-500 text-sm mt-1">En yeni kombinleri ve parçaları keşfedin.</p>
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
            {products.map((product) => (
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

      {/* İlan Ekle Butonu */}
      <a href="/sell" className="fixed bottom-8 right-8 bg-black text-white px-6 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform z-50">
        + İlan Ekle
      </a>

    </main>
  );
}
