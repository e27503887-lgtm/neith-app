"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import ProductCard from "../components/ProductCard";
import FollowButton from "../components/FollowButton";
import StoreCard, { type StoreCardData } from "../components/StoreCard";
import SkeletonGrid from "../components/SkeletonGrid";
import { supabase } from "../utils/supabase";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  comment_count?: number;
  account_type?: string | null;
};

type ProfileResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

type Store = StoreCardData;

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<ProfileResult[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!q) {
      return;
    }

    let active = true;

    async function search() {
      setLoading(true);

      const [{ data: matchedProducts }, { data: matchedUsers }, { data: matchedStores }] = await Promise.all([
        supabase.from("products").select("*").ilike("title", `%${q}%`),
        supabase
          .from("profiles")
          .select("id, username, avatar_url, account_type")
          .ilike("username", `%${q}%`),
        supabase
          .from("profiles")
          .select("id, username, avatar_url, bio")
          .eq("account_type", "brand")
          .ilike("username", `%${q}%`),
      ]);

      if (!active) return;

      const storeIds = (matchedStores ?? []).map((s) => s.id);
      const [{ data: storeProductRows }, { data: storeFollowRows }] = await Promise.all([
        storeIds.length
          ? supabase
              .from("products")
              .select("id, user_id, image_url, created_at")
              .eq("seller_type", "brand")
              .in("user_id", storeIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as { id: number | string; user_id: string; image_url: string }[] }),
        storeIds.length
          ? supabase.from("follows").select("following_id").in("following_id", storeIds)
          : Promise.resolve({ data: [] as { following_id: string }[] }),
      ]);

      if (!active) return;

      const recentProductsByStore = new Map<string, { id: number | string; image_url: string }[]>();
      const productCountByStore = new Map<string, number>();
      (storeProductRows ?? []).forEach((p) => {
        productCountByStore.set(p.user_id, (productCountByStore.get(p.user_id) ?? 0) + 1);
        const list = recentProductsByStore.get(p.user_id) ?? [];
        if (list.length < 3) {
          list.push({ id: p.id, image_url: p.image_url });
          recentProductsByStore.set(p.user_id, list);
        }
      });

      const followerCountByStore = new Map<string, number>();
      (storeFollowRows ?? []).forEach((f) => {
        followerCountByStore.set(f.following_id, (followerCountByStore.get(f.following_id) ?? 0) + 1);
      });

      setStores(
        (matchedStores ?? []).map((s) => ({
          id: s.id,
          username: s.username,
          avatar_url: s.avatar_url,
          bio: s.bio,
          recentProducts: recentProductsByStore.get(s.id) ?? [],
          productCount: productCountByStore.get(s.id) ?? 0,
          followerCount: followerCountByStore.get(s.id) ?? 0,
        }))
      );

      const usernames = [...new Set((matchedProducts ?? []).map((p) => p.username))];
      const { data: profiles } = usernames.length
        ? await supabase
            .from("profiles")
            .select("username, avatar_url, account_type")
            .in("username", usernames)
        : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

      if (!active) return;

      const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));

      const productIds = (matchedProducts ?? []).map((p) => p.id);
      const { data: commentRows } = productIds.length
        ? await supabase.from("comments").select("product_id").in("product_id", productIds)
        : { data: [] as { product_id: number | string }[] };

      if (!active) return;

      const commentCountByProduct = new Map<number | string, number>();
      (commentRows ?? []).forEach((c) => {
        commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
      });

      setProducts(
        (matchedProducts ?? []).map((p) => ({
          ...p,
          avatar_url: profileByUsername.get(p.username)?.avatar_url ?? null,
          account_type: profileByUsername.get(p.username)?.account_type ?? null,
          comment_count: commentCountByProduct.get(p.id) ?? 0,
        }))
      );
      setUsers((matchedUsers ?? []).filter((u) => u.account_type !== "brand"));
      setLoading(false);
    }

    search();
    return () => {
      active = false;
    };
  }, [q]);

  if (!q) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6">
        <div className="max-w-5xl mx-auto text-center text-gray-500 py-24">
          Kombin, ürün veya kullanıcı ara
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-6 w-48 bg-neutral-200 rounded animate-pulse mb-8" />
          <SkeletonGrid count={6} />
        </div>
      </main>
    );
  }

  function adjustStoreFollowerCount(id: string, delta: number) {
    setStores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, followerCount: Math.max(0, s.followerCount + delta) } : s))
    );
  }

  const totalCount = products.length + users.length + stores.length;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold mb-8">
          &ldquo;{q}&rdquo; için {totalCount} sonuç
        </h1>

        {totalCount === 0 ? (
          <div className="flex flex-col items-center text-center text-gray-500 py-24 gap-3">
            <SearchX size={28} strokeWidth={1} className="text-neutral-300" />
            Aradığın şey bulunamadı.
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {users.length > 0 && (
              <section>
                <h3 className="section-label mb-3">Kullanıcılar</h3>
                <div className="bg-paper border border-neutral-200 rounded-xl divide-y divide-neutral-200 overflow-hidden">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                      <Link
                        href={`/profile/${u.username}`}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        {u.avatar_url ? (
                          <Image
                            src={u.avatar_url}
                            alt={u.username}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                            {u.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <p className="text-sm font-medium truncate">@{u.username}</p>
                      </Link>
                      <FollowButton targetUserId={u.id} compact />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {stores.length > 0 && (
              <section>
                <h3 className="section-label mb-3">Mağazalar</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stores.map((s) => (
                    <StoreCard
                      key={s.id}
                      store={s}
                      onFollow={() => adjustStoreFollowerCount(s.id, 1)}
                      onUnfollow={() => adjustStoreFollowerCount(s.id, -1)}
                    />
                  ))}
                </div>
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h3 className="section-label mb-3">Ürünler</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
