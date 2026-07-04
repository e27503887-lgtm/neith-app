import PopularProductCard from "../components/PopularProductCard";
import { supabase } from "../utils/supabase";

export default async function PopularPage() {
  const { data: products } = await supabase
    .from("popular_products")
    .select("*")
    .gt("popularity_score", 0)
    .order("popularity_score", { ascending: false })
    .limit(30);

  const popularProducts = products ?? [];

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl tracking-tight text-ink">Popüler Ürünler</h1>
          <p className="text-gray-500 text-sm mt-1">
            Topluluğun en çok ilgi gördüğü parçalar.
          </p>
        </div>

        {popularProducts.length === 0 ? (
          <p className="text-gray-500 text-sm">Henüz popüler bir ürün yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {popularProducts.map((product, index) => (
              <PopularProductCard key={product.id} product={product} rank={index + 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
