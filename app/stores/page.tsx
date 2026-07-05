"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Store as StoreIcon } from "lucide-react";
import { supabase } from "../utils/supabase";
import StoreCard, { type StoreCardData } from "../components/StoreCard";
import SkeletonGrid from "../components/SkeletonGrid";

type Store = StoreCardData & { joinedAt: string };

type Sort = "followers" | "products" | "newest";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "followers", label: "En Çok Takip Edilen" },
  { value: "products", label: "En Çok Ürünü Olan" },
  { value: "newest", label: "En Yeni Katılan" },
];

export default function StoresPage() {
  const [loading, setLoading] = useState(true);
  const [viewerAccountType, setViewerAccountType] = useState<string | null | undefined>(undefined);
  const [stores, setStores] = useState<Store[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("followers");

  useEffect(() => {
    let active = true;

    async function load() {
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
        setLoading(false);
        return;
      }

      const [{ data: productRows }, { data: followRows }] = await Promise.all([
        supabase
          .from("products")
          .select("id, user_id, image_url, created_at")
          .eq("seller_type", "brand")
          .in("user_id", brandIds)
          .order("created_at", { ascending: false }),
        supabase.from("follows").select("following_id").in("following_id", brandIds),
      ]);

      if (!active) return;

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
          joinedAt: b.created_at,
        }))
      );
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

  const visibleStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? stores.filter((s) => s.username.toLowerCase().includes(q)) : stores;

    const sorted = [...filtered];
    if (sort === "followers") {
      sorted.sort((a, b) => b.followerCount - a.followerCount);
    } else if (sort === "products") {
      sorted.sort((a, b) => b.productCount - a.productCount);
    } else {
      sorted.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    }
    return sorted;
  }, [stores, search, sort]);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 border-b border-neutral-200 pb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500 mb-2">Marka Vitrini</p>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">Mağazalar</h1>
          <p className="mt-3 text-sm text-gray-500">Sevdiğin markaları keşfet</p>

          <div className="flex flex-wrap items-end gap-4 mt-6">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search size={15} strokeWidth={1.5} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Marka adına göre ara..."
                className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
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
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
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
        ) : visibleStores.length === 0 ? (
          <p className="text-sm text-gray-500">&quot;{search}&quot; ile eşleşen mağaza bulunamadı.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onFollow={() => adjustFollowerCount(store.id, 1)}
                onUnfollow={() => adjustFollowerCount(store.id, -1)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
