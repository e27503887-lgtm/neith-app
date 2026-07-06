"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingBag, Store as StoreIcon } from "lucide-react";
import { supabase } from "../utils/supabase";
import ProductCard from "../components/ProductCard";
import StoreCard, { type StoreCardData } from "../components/StoreCard";
import SkeletonGrid from "../components/SkeletonGrid";
import { CATEGORIES } from "@/lib/categories";
import BrandBadge from "../components/BrandBadge";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  category: string | null;
  created_at: string;
  avatar_url: string | null;
  account_type: string | null;
  comment_count: number;
};

type Store = StoreCardData;

type FollowedBrand = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  newThisWeekCount: number;
};

type Sort = "newest" | "price_asc" | "price_desc" | "popular";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "En Yeni" },
  { value: "price_asc", label: "Fiyat: Artan" },
  { value: "price_desc", label: "Fiyat: Azalan" },
  { value: "popular", label: "Popüler" },
];

function isWithinLastWeek(createdAt: string) {
  const createdDate = new Date(createdAt);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return createdDate >= weekAgo;
}

export default function StoresPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper pt-24 pb-24 px-6" />}>
      <StoresPageContent />
    </Suspense>
  );
}

function StoresPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "following" ? "following" : "all";

  const [loading, setLoading] = useState(true);
  const [viewerAccountType, setViewerAccountType] = useState<string | null | undefined>(undefined);

  const [products, setProducts] = useState<Product[]>([]);
  const [popularityById, setPopularityById] = useState<Map<number | string, number>>(new Map());
  const [stores, setStores] = useState<Store[]>([]);
  const [followedBrands, setFollowedBrands] = useState<FollowedBrand[]>([]);
  const [followedProducts, setFollowedProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const [{ data: brandProfiles }, { data: viewerProfile }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, avatar_url, bio, created_at")
          .eq("account_type", "brand")
          .order("username", { ascending: true }),
        uid
          ? supabase.from("profiles").select("account_type").eq("id", uid).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (!active) return;
      setViewerAccountType(uid ? viewerProfile?.account_type ?? "user" : null);

      const brandIds = (brandProfiles ?? []).map((b) => b.id);

      if (brandIds.length === 0) {
        setStores([]);
        setProducts([]);
        setFollowedBrands([]);
        setFollowedProducts([]);
        setLoading(false);
        return;
      }

      const [{ data: productRows }, { data: followRows }, { data: popularRows }] = await Promise.all([
        supabase
          .from("products")
          .select("id, user_id, username, title, price, image_url, category, created_at")
          .eq("seller_type", "brand")
          .in("user_id", brandIds)
          .order("created_at", { ascending: false }),
        supabase.from("follows").select("following_id").in("following_id", brandIds),
        supabase.from("popular_products").select("id, popularity_score"),
      ]);

      if (!active) return;

      const profileById = new Map((brandProfiles ?? []).map((b) => [b.id, b]));

      const recentProductsByBrand = new Map<string, { id: number | string; image_url: string }[]>();
      const productCountByBrand = new Map<string, number>();
      (productRows ?? []).forEach((p) => {
        productCountByBrand.set(p.user_id, (productCountByBrand.get(p.user_id) ?? 0) + 1);
        const list = recentProductsByBrand.get(p.user_id) ?? [];
        if (list.length < 3) {
          list.push({ id: p.id, image_url: p.image_url });
          recentProductsByBrand.set(p.user_id, list);
        }
      });

      const followerCountByBrand = new Map<string, number>();
      (followRows ?? []).forEach((f) => {
        followerCountByBrand.set(f.following_id, (followerCountByBrand.get(f.following_id) ?? 0) + 1);
      });

      setStores(
        (brandProfiles ?? []).map((b) => ({
          id: b.id,
          username: b.username,
          avatar_url: b.avatar_url,
          bio: b.bio,
          recentProducts: recentProductsByBrand.get(b.id) ?? [],
          productCount: productCountByBrand.get(b.id) ?? 0,
          followerCount: followerCountByBrand.get(b.id) ?? 0,
        }))
      );

      const productIds = (productRows ?? []).map((p) => p.id);
      const { data: commentRows } = productIds.length
        ? await supabase.from("comments").select("product_id").in("product_id", productIds)
        : { data: [] as { product_id: number | string }[] };

      if (!active) return;

      const commentCountByProduct = new Map<number | string, number>();
      (commentRows ?? []).forEach((c) => {
        commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
      });

      setProducts(
        (productRows ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          image_url: p.image_url,
          username: p.username,
          category: p.category,
          created_at: p.created_at,
          avatar_url: profileById.get(p.user_id)?.avatar_url ?? null,
          account_type: "brand",
          comment_count: commentCountByProduct.get(p.id) ?? 0,
        }))
      );

      let followedBrandsResult: FollowedBrand[] = [];
      let followedProductsResult: Product[] = [];

      if (uid) {
        const { data: followedRows } = await supabase.from("follows").select("following_id").eq("follower_id", uid);
        const followedIds = (followedRows ?? [])
          .map((row) => row.following_id)
          .filter((id): id is string => Boolean(id));

        if (followedIds.length > 0) {
          const { data: followedProfiles } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, bio, created_at")
            .in("id", followedIds)
            .eq("account_type", "brand");

          followedBrandsResult = (followedProfiles ?? []).map((profile) => ({
            id: profile.id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            bio: profile.bio,
            created_at: profile.created_at,
            newThisWeekCount: 0,
          }));

          const followedBrandIds = (followedProfiles ?? []).map((profile) => profile.id);
          if (followedBrandIds.length > 0) {
            const { data: followedProductRows } = await supabase
              .from("products")
              .select("id, user_id, username, title, price, image_url, category, created_at")
              .eq("seller_type", "brand")
              .in("user_id", followedBrandIds)
              .order("created_at", { ascending: false });

            const followedProductIds = (followedProductRows ?? []).map((p) => p.id);
            const { data: followedCommentRows } = followedProductIds.length
              ? await supabase.from("comments").select("product_id").in("product_id", followedProductIds)
              : { data: [] as { product_id: number | string }[] };

            const commentCountByFollowedProduct = new Map<number | string, number>();
            (followedCommentRows ?? []).forEach((comment) => {
              commentCountByFollowedProduct.set(comment.product_id, (commentCountByFollowedProduct.get(comment.product_id) ?? 0) + 1);
            });

            const newThisWeekCountByBrand = new Map<string, number>();
            (followedProductRows ?? []).forEach((product) => {
              if (isWithinLastWeek(product.created_at)) {
                newThisWeekCountByBrand.set(product.user_id, (newThisWeekCountByBrand.get(product.user_id) ?? 0) + 1);
              }
            });

            followedBrandsResult = (followedProfiles ?? []).map((profile) => ({
              id: profile.id,
              username: profile.username,
              avatar_url: profile.avatar_url,
              bio: profile.bio,
              created_at: profile.created_at,
              newThisWeekCount: newThisWeekCountByBrand.get(profile.id) ?? 0,
            }));

            followedProductsResult = (followedProductRows ?? []).map((product) => ({
              id: product.id,
              title: product.title,
              price: product.price,
              image_url: product.image_url,
              username: product.username,
              category: product.category,
              created_at: product.created_at,
              avatar_url: followedProfiles?.find((profile) => profile.id === product.user_id)?.avatar_url ?? null,
              account_type: "brand",
              comment_count: commentCountByFollowedProduct.get(product.id) ?? 0,
            }));
          }
        }
      }

      if (!active) return;

      setFollowedBrands(followedBrandsResult);
      setFollowedProducts(followedProductsResult);
      setPopularityById(new Map((popularRows ?? []).map((r) => [r.id, r.popularity_score as number])));
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function adjustFollowerCount(id: string, delta: number) {
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, followerCount: Math.max(0, s.followerCount + delta) } : s))
    );
  }

  function setTab(tab: "all" | "following") {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "following") {
      params.set("tab", "following");
    } else {
      params.delete("tab");
    }

    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }

  const hasActiveFilters = Boolean(
    search.trim() || brandFilter || categoryFilter || minPrice.trim() || maxPrice.trim()
  );

  function clearFilters() {
    setSearch("");
    setBrandFilter("");
    setCategoryFilter("");
    setMinPrice("");
    setMaxPrice("");
  }

  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    const filtered = products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      if (brandFilter && p.username !== brandFilter) return false;
      if (categoryFilter && p.category !== categoryFilter) return false;
      if (min !== null && p.price < min) return false;
      if (max !== null && p.price > max) return false;
      return true;
    });

    const sorted = [...filtered];
    if (sort === "price_asc") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sort === "price_desc") {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sort === "popular") {
      sorted.sort((a, b) => (popularityById.get(b.id) ?? 0) - (popularityById.get(a.id) ?? 0));
    } else {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return sorted;
  }, [products, search, brandFilter, categoryFilter, minPrice, maxPrice, sort, popularityById]);

  const isLoggedIn = viewerAccountType !== undefined && viewerAccountType !== null;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 border-b border-neutral-200 pb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-2">Marka Vitrini</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">Mağazalar</h1>
          <p className="mt-3 text-sm text-gray-500">
            {loading ? "Yükleniyor..." : activeTab === "following" ? "Takip ettiğin markalardan en yeni parçalar" : `${visibleProducts.length} ürün bulundu`}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-2 text-sm transition-colors ${activeTab === "all" ? "bg-ink text-white" : "bg-white text-gray-700 border border-neutral-200 hover:border-ink"}`}
            >
              Tüm Ürünler
            </button>
            <button
              onClick={() => setTab("following")}
              className={`px-4 py-2 text-sm transition-colors ${activeTab === "following" ? "bg-ink text-white" : "bg-white text-gray-700 border border-neutral-200 hover:border-ink"}`}
            >
              Takip Ettiklerim
            </button>
          </div>
        </div>

        {activeTab === "following" ? (
          loading ? (
            <SkeletonGrid count={8} />
          ) : !isLoggedIn ? (
            <div className="flex flex-col items-center text-center py-20 gap-3">
              <ShoppingBag size={28} strokeWidth={1} className="text-neutral-300" />
              <p className="text-neutral-500 text-sm">Markaları takip etmek için giriş yap.</p>
              <Link href="/login" className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors">
                Giriş yap
              </Link>
            </div>
          ) : followedBrands.length === 0 ? (
            <div className="flex flex-col items-center text-center py-20 gap-3">
              <StoreIcon size={28} strokeWidth={1.2} className="text-gray-300" />
              <p className="text-neutral-500 text-sm">Henüz bir marka takip etmiyorsun.</p>
              <Link
                href="/stores?tab=all"
                className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
              >
                Tüm ürünlere göz at
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 overflow-x-auto pb-2">
                <div className="flex gap-3 min-w-max">
                  {followedBrands.map((brand) => (
                    <Link
                      key={brand.id}
                      href={`/profile/${brand.username}`}
                      className="flex items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 py-2 shadow-sm hover:border-ink transition-colors"
                    >
                      {brand.avatar_url ? (
                        <Image
                          src={brand.avatar_url}
                          alt={brand.username}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                          {brand.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-sm font-medium text-ink">
                          @{brand.username}
                          <BrandBadge />
                        </div>
                        {brand.newThisWeekCount > 0 ? (
                          <p className="text-xs text-gray-500">{brand.newThisWeekCount} yeni ürün bu hafta</p>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {followedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )
        ) : (
          <>
            <div className="relative max-w-md mt-2">
              <Search size={15} strokeWidth={1.5} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ürün adına göre ara..."
                className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            <div className="flex items-end gap-4 mt-6 overflow-x-auto pb-1">
              <div className="shrink-0">
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Marka</label>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                >
                  <option value="">Tüm Markalar</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.username}>
                      {s.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="shrink-0">
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Kategori</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                >
                  <option value="">Tüm Kategoriler</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="shrink-0">
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Min Fiyat</label>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-24 border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              <div className="shrink-0">
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Max Fiyat</label>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="∞"
                  className="w-24 border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              <div className="shrink-0">
                <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Sırala</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="shrink-0 text-xs uppercase tracking-wide text-gray-500 underline underline-offset-4 hover:text-accent transition-colors pb-2"
                >
                  Filtreleri Temizle
                </button>
              )}
            </div>

            {loading ? (
              <SkeletonGrid count={8} />
            ) : stores.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 gap-3">
                <StoreIcon size={28} strokeWidth={1.2} className="text-gray-300" />
                <p className="text-neutral-500 text-sm">Henüz mağaza yok.</p>
                <p className="text-neutral-400 text-xs">Markalar onaylandıkça burada listelenecek.</p>
                {viewerAccountType && viewerAccountType !== "brand" && (
                  <Link
                    href="/brand/apply"
                    className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
                  >
                    Markanızı buraya eklemek için başvurun
                  </Link>
                )}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 gap-3">
                <ShoppingBag size={28} strokeWidth={1} className="text-neutral-300" />
                <p className="text-neutral-500 text-sm">Markalar henüz ürün eklememiş.</p>
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center text-center py-20 gap-3">
                <ShoppingBag size={28} strokeWidth={1} className="text-neutral-300" />
                <p className="text-neutral-500 text-sm">Bu kriterlere uygun ürün bulunamadı.</p>
                <button
                  onClick={clearFilters}
                  className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
                >
                  Filtreleri Temizle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {!loading && stores.length > 0 && (
              <section className="mt-20 pt-10 border-t border-neutral-200">
                <h2 className="font-serif text-2xl text-ink tracking-tight mb-5">Tüm Mağazalar</h2>
                <div className="flex gap-5 overflow-x-auto pb-2">
                  {stores.map((store) => (
                    <div key={store.id} className="shrink-0 w-72">
                      <StoreCard
                        store={store}
                        onFollow={() => adjustFollowerCount(store.id, 1)}
                        onUnfollow={() => adjustFollowerCount(store.id, -1)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
