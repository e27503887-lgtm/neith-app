"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";
import ProductCard from "../components/ProductCard";

const PAGE_SIZE = 20;

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  seller_type: string | null;
  created_at: string;
  avatar_url: string | null;
  account_type: string | null;
  comment_count: number;
};

type Tab = "all" | "user" | "brand";
type Sort = "newest" | "price_asc" | "price_desc" | "popular";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "user", label: "Kullanıcı İlanları" },
  { key: "brand", label: "Marka Ürünleri" },
];

export default function ListingsPage() {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [popularityById, setPopularityById] = useState<Map<number | string, number>>(new Map());

  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (active) setCurrentUserId(userData.user?.id ?? null);

      const { data: productRows } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      const usernames = [...new Set((productRows ?? []).map((p) => p.username))];
      const productIds = (productRows ?? []).map((p) => p.id);

      const [{ data: profileRows }, { data: commentRows }, { data: popularRows }] = await Promise.all([
        usernames.length
          ? supabase.from("profiles").select("username, avatar_url, account_type").in("username", usernames)
          : Promise.resolve({ data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] }),
        productIds.length
          ? supabase.from("comments").select("product_id").in("product_id", productIds)
          : Promise.resolve({ data: [] as { product_id: number | string }[] }),
        supabase.from("popular_products").select("id, popularity_score"),
      ]);

      if (!active) return;

      const profileByUsername = new Map((profileRows ?? []).map((p) => [p.username, p]));

      const commentCountByProduct = new Map<number | string, number>();
      (commentRows ?? []).forEach((c) => {
        commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
      });

      setProducts(
        (productRows ?? []).map((p) => ({
          ...p,
          avatar_url: profileByUsername.get(p.username)?.avatar_url ?? null,
          account_type: profileByUsername.get(p.username)?.account_type ?? null,
          comment_count: commentCountByProduct.get(p.id) ?? 0,
        }))
      );

      setPopularityById(new Map((popularRows ?? []).map((r) => [r.id, r.popularity_score as number])));
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, sort, minPrice, maxPrice]);

  const filteredAndSorted = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;

    const filtered = products.filter((p) => {
      if (tab === "user" && p.seller_type === "brand") return false;
      if (tab === "brand" && p.seller_type !== "brand") return false;
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
  }, [products, tab, sort, minPrice, maxPrice, popularityById]);

  const visibleProducts = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 border-b border-neutral-200 pb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-2">Vitrin</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">İlanlar</h1>
          <p className="mt-3 text-sm text-gray-500">
            {loading ? "Yükleniyor..." : `${filteredAndSorted.length} ilan listeleniyor`}
          </p>
        </div>

        <div className="flex gap-6 border-b border-neutral-200 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key ? "border-accent text-ink" : "border-transparent text-gray-500 hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4 mb-10">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Sırala</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
            >
              <option value="newest">En Yeni</option>
              <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
              <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
              <option value="popular">Popüler</option>
            </select>
          </div>

          <div>
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

          <div>
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

          {(minPrice || maxPrice) && (
            <button
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
              }}
              className="text-xs uppercase tracking-wide text-gray-500 underline underline-offset-4 hover:text-accent transition-colors pb-2"
            >
              Fiyat Filtresini Temizle
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 gap-3">
            <p className="text-neutral-500 text-sm">Henüz ilan yok.</p>
            {currentUserId && (
              <Link
                href="/sell"
                className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
              >
                İlan Ver
              </Link>
            )}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <p className="text-sm text-gray-500">Bu filtrelerle eşleşen ilan bulunamadı.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="btn-primary"
                >
                  Daha Fazla Yükle
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
