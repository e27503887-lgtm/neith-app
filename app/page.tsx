import Link from "next/link";
import Image from "next/image";
import ProductCard from "./components/ProductCard";
import OutfitCard from "./components/OutfitCard";
import OutfitRecommendations from "./components/OutfitRecommendations";
import PopularProducts from "./components/PopularProducts";
import FollowingFeed from "./components/FollowingFeed";
import SuggestedUsers from "./components/SuggestedUsers";
import BrandBadge from "./components/BrandBadge";
import { supabase } from "./utils/supabase";

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { filter } = await searchParams;
  const activeFilter =
    filter === "products" || filter === "outfits" || filter === "brand" || filter === "following"
      ? filter
      : "all";

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: outfits } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false });

  const usernames = [...new Set((products ?? []).map((p) => p.username))];
  const outfitUserIds = [...new Set((outfits ?? []).map((o) => o.user_id))];

  const { data: profiles } = usernames.length
    ? await supabase
        .from("profiles")
        .select("username, avatar_url, account_type")
        .in("username", usernames)
    : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

  const { data: outfitProfiles } = outfitUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", outfitUserIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));
  const profileById = new Map((outfitProfiles ?? []).map((p) => [p.id, p]));

  const productIds = (products ?? []).map((p) => p.id);
  const { data: commentRows } = productIds.length
    ? await supabase.from("comments").select("product_id").in("product_id", productIds)
    : { data: [] as { product_id: number | string }[] };

  const commentCountByProduct = new Map<number | string, number>();
  (commentRows ?? []).forEach((c) => {
    commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
  });

  const allProducts = (products ?? []).map((product) => ({
    ...product,
    avatar_url: profileByUsername.get(product.username)?.avatar_url ?? null,
    account_type: profileByUsername.get(product.username)?.account_type ?? null,
    comment_count: commentCountByProduct.get(product.id) ?? 0,
  }));

  const allOutfits = (outfits ?? []).map((outfit) => ({
    ...outfit,
    username: profileById.get(outfit.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(outfit.user_id)?.avatar_url ?? null,
    account_type: profileById.get(outfit.user_id)?.account_type ?? null,
  }));

  type FeedItem =
    | { kind: "product"; created_at: string; data: (typeof allProducts)[number] }
    | { kind: "outfit"; created_at: string; data: (typeof allOutfits)[number] };

  const mixedFeed: FeedItem[] = [
    ...allProducts.map((p): FeedItem => ({ kind: "product", created_at: p.created_at, data: p })),
    ...allOutfits.map((o): FeedItem => ({ kind: "outfit", created_at: o.created_at, data: o })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderFeedItem = (item: FeedItem) =>
    item.kind === "product" ? (
      <ProductCard key={`p-${item.data.id}`} product={item.data} />
    ) : (
      <OutfitCard key={`o-${item.data.id}`} outfit={item.data} />
    );

  const featuredOutfits = allOutfits.filter((o) => o.is_featured).slice(0, 6);
  const communityOutfits = allOutfits.filter((o) => o.creator_type === "user").slice(0, 6);
  const brandCreatorOutfits = allOutfits.filter((o) => o.creator_type === "brand").slice(0, 6);

  const { data: popularProductsRaw } = await supabase
    .from("popular_products")
    .select("*")
    .gt("popularity_score", 0)
    .order("popularity_score", { ascending: false })
    .limit(8);

  const popularProducts = popularProductsRaw ?? [];

  const brandProducts = allProducts.filter((p) => p.seller_type === "brand");

  const brandShowcase = brandProducts.slice(0, 4);
  const isBrandShowcase = brandShowcase.length > 0;
  const sidePanelProducts = isBrandShowcase ? brandShowcase : allProducts.slice(0, 4);

  const tabs = [
    { label: "Tümü", value: "all", href: "/" },
    { label: "Takip Ettiklerim", value: "following", href: "/?filter=following" },
    { label: "Ürünler", value: "products", href: "/?filter=products" },
    { label: "Kombinler", value: "outfits", href: "/?filter=outfits" },
    { label: "Marka Ürünleri", value: "brand", href: "/?filter=brand" },
  ];

  const showEmptyState =
    (activeFilter === "all" && mixedFeed.length === 0) ||
    (activeFilter === "products" && allProducts.length === 0) ||
    (activeFilter === "outfits" && allOutfits.length === 0) ||
    (activeFilter === "brand" && brandProducts.length === 0);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <section className="max-w-6xl mx-auto pt-6 pb-10 md:pb-14 border-b border-neutral-200 mb-12">
        <div className="max-w-xl">
          <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-ink leading-tight">
            Stilini paylaş, gardırobunu sat.
          </h1>
          <p className="text-gray-500 text-sm mt-3">
            Kombinlerini keşfettir, sevmediğin parçalara yeni bir sahip bul — hepsi tek bir yerde.
          </p>
          <a href="#feed" className="btn-primary mt-6">
            Keşfet
          </a>
        </div>
      </section>

      <div className="max-w-6xl mx-auto">
        <OutfitRecommendations
          featured={featuredOutfits}
          community={communityOutfits}
          brand={brandCreatorOutfits}
        />

        <PopularProducts products={popularProducts} />
      </div>

      <div id="feed" className="max-w-6xl mx-auto flex items-start gap-8 pt-16 scroll-mt-24">
        <div className="flex-1 min-w-0">
          <div className="mb-6">
            <h2 className="text-2xl tracking-tight text-ink">Sizin İçin Seçilenler</h2>
            <p className="text-gray-500 text-sm mt-1">En yeni kombinleri ve parçaları keşfedin.</p>
          </div>

          <div className="flex gap-6 border-b border-neutral-200 mb-8 overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.value}
                href={tab.href}
                className={`pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap ${
                  activeFilter === tab.value
                    ? "border-accent text-ink"
                    : "border-transparent text-gray-500 hover:text-accent"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {activeFilter === "following" ? (
            <FollowingFeed />
          ) : showEmptyState ? (
            <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
              <p className="text-gray-500">Henüz ilan yok. İlk kombini sen paylaş!</p>
              <Link href="/sell" className="btn-primary">
                İlan Ver
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFilter === "all" && (
                <>
                  {mixedFeed.slice(0, 4).map(renderFeedItem)}
                  <div className="col-span-full lg:hidden">
                    <SuggestedUsers variant="mobile" />
                  </div>
                  {mixedFeed.slice(4).map(renderFeedItem)}
                </>
              )}
              {activeFilter === "products" &&
                allProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              {activeFilter === "outfits" &&
                allOutfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
              {activeFilter === "brand" &&
                brandProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>

        {sidePanelProducts.length > 0 && (
          <aside className="hidden lg:flex flex-col gap-6 w-72 shrink-0 sticky top-24">
            <div className="bg-paper border border-neutral-200 p-4">
              <h3 className="section-label mb-3">
                {isBrandShowcase ? "Marka Vitrini" : "Yeni Gelenler"}
              </h3>
              <div className="flex flex-col gap-3">
                {sidePanelProducts.map((product) => (
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
                      <p className="text-sm truncate flex items-center gap-1">
                        {product.title}
                        {product.account_type === "brand" && <BrandBadge />}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.price.toLocaleString("tr-TR")} ₺
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <SuggestedUsers />
          </aside>
        )}
      </div>

      {/* İlan Ekle Butonu */}
      <a href="/sell" className="fixed bottom-8 right-8 bg-ink text-paper px-6 py-3 rounded-full font-medium shadow-lg hover:scale-105 transition-transform z-50">
        + İlan Ekle
      </a>

    </main>
  );
}
