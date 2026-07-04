import Link from "next/link";
import PopularProductCard from "../components/PopularProductCard";
import TrendingCard, { type TrendingItem } from "../components/TrendingCard";
import { supabase } from "../utils/supabase";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

const TABS = [
  { label: "Şu Anda Moda", value: "trending", href: "/popular?tab=trending" },
  { label: "Tüm Zamanlar", value: "all-time", href: "/popular" },
] as const;

export default async function PopularPage({ searchParams }: Props) {
  const { tab } = await searchParams;
  const activeTab = tab === "trending" ? "trending" : "all-time";

  let content: React.ReactNode;

  if (activeTab === "trending") {
    const [{ data: trendingProductsRaw }, { data: trendingOutfitsRaw }] = await Promise.all([
      supabase
        .from("trending_products")
        .select("*")
        .gt("trend_score", 0)
        .order("trend_score", { ascending: false }),
      supabase
        .from("trending_outfits")
        .select("*")
        .gt("trend_score", 0)
        .order("trend_score", { ascending: false }),
    ]);

    const rankedTrendingItems = [
      ...(trendingProductsRaw ?? []).map((p) => ({
        score: p.trend_score as number,
        item: {
          kind: "product" as const,
          id: p.id,
          title: p.title,
          price: p.price,
          image_url: p.image_url,
        },
      })),
      ...(trendingOutfitsRaw ?? []).map((o) => ({
        score: o.trend_score as number,
        item: {
          kind: "outfit" as const,
          id: o.id,
          title: o.title,
          image_url: o.image_url,
        },
      })),
    ].sort((a, b) => b.score - a.score);

    const trendingItems: TrendingItem[] = rankedTrendingItems.slice(0, 30).map((r) => r.item);

    content =
      trendingItems.length === 0 ? (
        <p className="text-gray-500 text-sm">Son 7 günde henüz bir hareketlilik yok.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingItems.map((item) => (
            <TrendingCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </div>
      );
  } else {
    const { data: products } = await supabase
      .from("popular_products")
      .select("*")
      .gt("popularity_score", 0)
      .order("popularity_score", { ascending: false })
      .limit(30);

    const popularProducts = products ?? [];

    content =
      popularProducts.length === 0 ? (
        <p className="text-gray-500 text-sm">Henüz popüler bir ürün yok.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {popularProducts.map((product, index) => (
            <PopularProductCard key={product.id} product={product} rank={index + 1} />
          ))}
        </div>
      );
  }

  const heading = activeTab === "trending" ? "Şu Anda Moda" : "Popüler Ürünler";
  const subheading =
    activeTab === "trending"
      ? "Son 7 günün en çok konuşulan parçaları ve kombinleri."
      : "Topluluğun en çok ilgi gördüğü parçalar.";

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl tracking-tight text-ink">{heading}</h1>
          <p className="text-gray-500 text-sm mt-1">{subheading}</p>
        </div>

        <div className="flex gap-6 border-b border-neutral-200 mb-8">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={t.href}
              className={`pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap ${
                activeTab === t.value
                  ? "border-accent text-ink"
                  : "border-transparent text-gray-500 hover:text-accent transition-colors"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {content}
      </div>
    </main>
  );
}
