import { Fragment } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Shirt } from "lucide-react";
import ProductCard from "./components/ProductCard";
import OutfitCard from "./components/OutfitCard";
import PostCard from "./components/PostCard";
import OutfitRecommendations from "./components/OutfitRecommendations";
import RecommendedItems from "./components/RecommendedItems";
import FreshPosts from "./components/FreshPosts";
import FeedLoadMore from "./components/FeedLoadMore";
import LazyVisible from "./components/LazyVisible";
import { supabase } from "./utils/supabase";
import { enrichPostsWithMedia } from "@/lib/posts";
import { FRESH_WINDOW_MS, applyFreshQuota, isFreshLowEngagement } from "@/lib/feed-mixer";

// Ekran dışı / masaüstüne özel / koşullu bileşenler ayrı chunk'lara bölünür:
// LazyVisible görünene kadar mount etmediği için kodları da ancak o zaman iner.
const TrendingStrip = dynamic(() =>
  import("./components/DeferredSections").then((m) => m.TrendingStrip)
);
const BrandPicksStrip = dynamic(() =>
  import("./components/DeferredSections").then((m) => m.BrandPicksStrip)
);
const PopularStrip = dynamic(() =>
  import("./components/DeferredSections").then((m) => m.PopularStrip)
);
const FollowingFeed = dynamic(() => import("./components/FollowingFeed"));
const SuggestedUsers = dynamic(() => import("./components/SuggestedUsers"));
const SocialFeed = dynamic(() => import("./components/SocialFeed"));
const OutfitBattle = dynamic(() => import("./components/OutfitBattle"));
const AIStylist = dynamic(() => import("./components/AIStylist"));
const BrandShowcase = dynamic(() => import("./components/BrandShowcase"));
const FashionEncyclopedia = dynamic(() => import("./components/FashionEncyclopedia"));

// İlk boyama bütçesi: sunucu tarafında yalnızca 6 sorgu.
// Trend/popüler/marka şeritleri görünür olunca istemciden yüklenir.
const PRODUCT_LIMIT = 24;
const OUTFIT_LIMIT = 24;
const POST_LIMIT = 12;
const INITIAL_FEED_MOBILE = 10;
const INITIAL_FEED_DESKTOP = 12;

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function Home({ searchParams }: Props) {
  const { filter } = await searchParams;
  const activeFilter =
    filter === "products" ||
    filter === "outfits" ||
    filter === "posts" ||
    filter === "brand" ||
    filter === "following"
      ? filter
      : "all";

  const now = new Date().toISOString();

  // Sorgular 1-4 (paralel): ürünler, kombinler, gönderiler, aktif moda haftası
  const [{ data: products }, { data: outfits }, { data: postsRaw }, { data: activeWeeks }] =
    await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PRODUCT_LIMIT),
      supabase
        .from("outfits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(OUTFIT_LIMIT),
      supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(POST_LIMIT),
      supabase.from("fashion_weeks").select("*").lte("starts_at", now).gte("ends_at", now).limit(1),
    ]);

  // Sorgu 5: gönderi medyaları (beğeni sayıları kartta istemciden gelir)
  const enrichedPostRows = await enrichPostsWithMedia(postsRaw ?? [], { includeLikes: false });

  // Sorgu 6: tüm içerik sahipleri tek profil sorgusunda
  const userIds = [
    ...new Set([
      ...(products ?? []).map((p) => p.user_id),
      ...(outfits ?? []).map((o) => o.user_id),
      ...enrichedPostRows.map((p) => p.user_id),
    ]),
  ].filter(Boolean);

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", userIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const activeWeek = (activeWeeks && activeWeeks[0]) || null;

  const allProducts = (products ?? []).map((product) => ({
    ...product,
    avatar_url: profileById.get(product.user_id)?.avatar_url ?? null,
    account_type: profileById.get(product.user_id)?.account_type ?? null,
  }));

  const allOutfits = (outfits ?? []).map((outfit) => ({
    ...outfit,
    username: profileById.get(outfit.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(outfit.user_id)?.avatar_url ?? null,
    account_type: profileById.get(outfit.user_id)?.account_type ?? null,
  }));

  const allPosts = enrichedPostRows.map((post) => ({
    ...post,
    username: profileById.get(post.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(post.user_id)?.avatar_url ?? null,
    account_type: profileById.get(post.user_id)?.account_type ?? null,
  }));

  type FeedItem =
    | { kind: "product"; created_at: string; data: (typeof allProducts)[number] }
    | { kind: "outfit"; created_at: string; data: (typeof allOutfits)[number] }
    | { kind: "post"; created_at: string; data: (typeof allPosts)[number] };

  const dateSortedFeed: FeedItem[] = [
    ...allProducts.map((p): FeedItem => ({ kind: "product", created_at: p.created_at, data: p })),
    ...allOutfits.map((o): FeedItem => ({ kind: "outfit", created_at: o.created_at, data: o })),
    ...allPosts.map((p): FeedItem => ({ kind: "post", created_at: p.created_at, data: p })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Hibrit kota: her 5 karttan biri son 24 saatin az beğenilmiş (<3)
  // içeriklerinden gelir. Beğeni sayıları yalnızca taze küme için sorgulanır.
  const freshCutoff = new Date(Date.now() - FRESH_WINDOW_MS).toISOString();
  const freshItems = dateSortedFeed.filter((item) => item.created_at >= freshCutoff);
  const freshProductIds = freshItems.filter((i) => i.kind === "product").map((i) => i.data.id);
  const freshOutfitIds = freshItems.filter((i) => i.kind === "outfit").map((i) => i.data.id);
  const freshPostIds = freshItems.filter((i) => i.kind === "post").map((i) => i.data.id);

  const [{ data: productLikes }, { data: outfitLikes }, { data: postLikes }] = await Promise.all([
    freshProductIds.length
      ? supabase.from("likes").select("product_id").in("product_id", freshProductIds)
      : Promise.resolve({ data: [] as { product_id: number | string }[] }),
    freshOutfitIds.length
      ? supabase.from("outfit_likes").select("outfit_id").in("outfit_id", freshOutfitIds)
      : Promise.resolve({ data: [] as { outfit_id: number | string }[] }),
    freshPostIds.length
      ? supabase.from("post_likes").select("post_id").in("post_id", freshPostIds)
      : Promise.resolve({ data: [] as { post_id: number | string }[] }),
  ]);

  const likeCountByKey = new Map<string, number>();
  const bump = (key: string) => likeCountByKey.set(key, (likeCountByKey.get(key) ?? 0) + 1);
  (productLikes ?? []).forEach((row) => bump(`product-${row.product_id}`));
  (outfitLikes ?? []).forEach((row) => bump(`outfit-${row.outfit_id}`));
  (postLikes ?? []).forEach((row) => bump(`post-${row.post_id}`));

  const mixedFeed = applyFreshQuota(dateSortedFeed, {
    isFresh: (item) =>
      isFreshLowEngagement(
        item.created_at,
        likeCountByKey.get(`${item.kind}-${item.data.id}`) ?? 0
      ),
    getCreatedAt: (item) => item.created_at,
  });

  // Mobil: posts ağırlıklı akış — tüm gönderiler + inceltilmiş ürün/kombin örneklemi
  const mobilePostItems = mixedFeed.filter((item) => item.kind === "post");
  const mobileNonPostItems = mixedFeed
    .filter((item) => item.kind !== "post")
    .filter((_, index) => index % 2 === 0)
    .slice(0, Math.max(4, mobilePostItems.length));
  // Kota yerleşimini korumak için mixedFeed'in kendi sırası esas alınır
  // (tarih sıralaması kota kartlarını geri gömerdi).
  const mobileSelection = new Set([...mobilePostItems, ...mobileNonPostItems]);
  const mobileFeed = mixedFeed
    .filter((item) => mobileSelection.has(item))
    .slice(0, INITIAL_FEED_MOBILE);

  const mobileCursor =
    mobileFeed.length > 0 ? mobileFeed[mobileFeed.length - 1].created_at : null;

  const desktopFeed = mixedFeed.slice(0, INITIAL_FEED_DESKTOP);
  const desktopCursor =
    desktopFeed.length > 0 ? desktopFeed[desktopFeed.length - 1].created_at : null;

  // Mobil: AIStylist'siz sade kartlar (daha az JS); masaüstü grid'i stil
  // ipuçlarını korur.
  const renderMobileFeedItem = (item: FeedItem, priority = false) =>
    item.kind === "product" ? (
      <ProductCard key={`p-${item.data.id}`} product={item.data} priority={priority} />
    ) : item.kind === "outfit" ? (
      <OutfitCard key={`o-${item.data.id}`} outfit={item.data} priority={priority} />
    ) : (
      <PostCard key={`post-${item.data.id}`} post={item.data} priority={priority} />
    );

  const renderFeedItem = (item: FeedItem) =>
    item.kind === "product" ? (
      <div key={`p-${item.data.id}`}>
        <ProductCard product={item.data} />
        <AIStylist productName={item.data.title} />
      </div>
    ) : item.kind === "outfit" ? (
      <OutfitCard key={`o-${item.data.id}`} outfit={item.data} />
    ) : (
      <PostCard key={`post-${item.data.id}`} post={item.data} />
    );

  const featuredOutfits = allOutfits.filter((o) => o.is_featured).slice(0, 6);
  const communityOutfits = allOutfits.filter((o) => o.creator_type === "user").slice(0, 6);
  const brandCreatorOutfits = allOutfits.filter((o) => o.creator_type === "brand").slice(0, 6);

  const brandProducts = allProducts.filter((p) => p.seller_type === "brand");
  const recommendedProducts = allProducts.slice(0, 3);

  const tabs = [
    { label: "Tümü", value: "all", href: "/" },
    { label: "Takip Ettiklerim", value: "following", href: "/?filter=following" },
    { label: "Ürünler", value: "products", href: "/?filter=products" },
    { label: "Kombinler", value: "outfits", href: "/?filter=outfits" },
    { label: "Gönderiler", value: "posts", href: "/?filter=posts" },
    { label: "Marka Ürünleri", value: "brand", href: "/?filter=brand" },
  ];

  const showEmptyState =
    (activeFilter === "all" && mixedFeed.length === 0) ||
    (activeFilter === "products" && allProducts.length === 0) ||
    (activeFilter === "outfits" && allOutfits.length === 0) ||
    (activeFilter === "posts" && allPosts.length === 0) ||
    (activeFilter === "brand" && brandProducts.length === 0);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      {activeWeek && (
        <div className="fixed top-16 left-0 right-0 bg-amber-50 border-b border-amber-100 text-sm text-amber-800 z-40">
          <div className="max-w-6xl mx-auto py-2 px-6 flex items-center justify-center">
            <Link href="/fashion-week" className="underline">
              🎪 {activeWeek.title} başladı — Katıl →
            </Link>
          </div>
        </div>
      )}

      {/* Mobil ana sayfa: posts ağırlıklı tek sütun akış + araya giren şeritler.
          Masaüstü düzeni aşağıda, dokunulmadan (hidden md:*). */}
      <div className="md:hidden max-w-xl mx-auto">
        {mobileFeed.length === 0 ? (
          <div className="flex flex-col items-center text-center py-12 gap-4">
            <Shirt size={28} strokeWidth={1} className="text-neutral-300" />
            <p className="text-gray-500">Henüz paylaşım yok. İlk gönderiyi sen paylaş!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <FreshPosts />
            {mobileFeed.map((item, index) => (
              <Fragment key={`m-${item.kind}-${item.data.id}`}>
                {renderMobileFeedItem(item, index < 2)}
                {index === 4 && (
                  <LazyVisible>
                    <TrendingStrip />
                  </LazyVisible>
                )}
                {index === 9 && (
                  <LazyVisible>
                    <BrandPicksStrip />
                  </LazyVisible>
                )}
              </Fragment>
            ))}
          </div>
        )}
        {mobileFeed.length <= 4 && (
          <LazyVisible>
            <TrendingStrip />
          </LazyVisible>
        )}
        {mobileFeed.length <= 9 && (
          <LazyVisible>
            <BrandPicksStrip />
          </LazyVisible>
        )}
        <FeedLoadMore initialCursor={mobileCursor} variant="list" />
      </div>

      <section className="hidden md:block max-w-6xl mx-auto pt-6 pb-10 md:pb-14 border-b border-neutral-200 mb-12">
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

      <div className="hidden md:block max-w-6xl mx-auto">
        <OutfitRecommendations
          featured={featuredOutfits}
          community={communityOutfits}
          brand={brandCreatorOutfits}
        />

        <LazyVisible minHeight={280}>
          <TrendingStrip />
        </LazyVisible>
        <LazyVisible minHeight={280}>
          <BrandPicksStrip />
        </LazyVisible>
        <LazyVisible minHeight={280}>
          <PopularStrip />
        </LazyVisible>
      </div>

      <div id="feed" className="hidden max-w-6xl mx-auto md:flex flex-col lg:flex-row items-start gap-8 pt-16 scroll-mt-24">
        <div className="w-full lg:w-[65%] min-w-0">
          <RecommendedItems products={recommendedProducts} />

          <LazyVisible minHeight={200}>
            <OutfitBattle />
          </LazyVisible>

          <LazyVisible minHeight={200}>
            <SocialFeed />
          </LazyVisible>

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
            <div className="flex flex-col items-center text-center py-12 md:py-24 gap-4">
              <Shirt size={28} strokeWidth={1} className="text-neutral-300" />
              <p className="text-gray-500">Henüz ilan yok. İlk kombini sen paylaş!</p>
              <Link href="/sell" className="btn-primary">
                İlan Ver
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 md:gap-6">
                {activeFilter === "all" && (
                  <>
                    <FreshPosts />
                    {desktopFeed.map((item) => renderFeedItem(item))}
                  </>
                )}
                {activeFilter === "products" &&
                  allProducts.map((p) => (
                    <div key={p.id}>
                      <ProductCard product={p} />
                      <AIStylist productName={p.title} />
                    </div>
                  ))}
                {activeFilter === "outfits" &&
                  allOutfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
                {activeFilter === "posts" && (
                  <>
                    <FreshPosts />
                    {allPosts.map((p) => (
                      <PostCard key={p.id} post={p} />
                    ))}
                  </>
                )}
                {activeFilter === "brand" &&
                  brandProducts.map((p) => (
                    <div key={p.id}>
                      <ProductCard product={p} />
                      <AIStylist productName={p.title} />
                    </div>
                  ))}
              </div>
              {activeFilter === "all" && (
                <FeedLoadMore initialCursor={desktopCursor} variant="grid" />
              )}
            </>
          )}
        </div>

        <aside id="brand-showcase" className="hidden lg:flex flex-col gap-6 lg:w-[35%] sticky top-24">
          <LazyVisible minHeight={200}>
            <BrandShowcase />
          </LazyVisible>
          <LazyVisible minHeight={200}>
            <FashionEncyclopedia />
          </LazyVisible>
        </aside>
      </div>

      <div className="hidden md:block lg:hidden max-w-6xl mx-auto pt-8">
        <LazyVisible minHeight={160}>
          <SuggestedUsers variant="mobile" />
        </LazyVisible>
      </div>
    </main>
  );
}
