"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import ProductCard from "./ProductCard";
import OutfitCard from "./OutfitCard";
import { supabase } from "../utils/supabase";

type ProductItem = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
  comment_count?: number;
  created_at: string;
};

type OutfitItem = {
  id: number | string;
  title: string;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
  created_at: string;
};

type FeedItem =
  | { kind: "product"; created_at: string; data: ProductItem }
  | { kind: "outfit"; created_at: string; data: OutfitItem };

export default function FollowingFeed() {
  const [checked, setChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      if (!active) return;
      setUserId(uid);
      setChecked(true);

      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", uid);

      const followingIds = (followRows ?? []).map((r) => r.following_id);

      if (!active) return;

      if (followingIds.length === 0) {
        setFeed([]);
        setLoading(false);
        return;
      }

      const [{ data: products }, { data: outfits }] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("outfits")
          .select("*")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const usernames = [...new Set((products ?? []).map((p) => p.username))];
      const { data: profiles } = usernames.length
        ? await supabase
            .from("profiles")
            .select("username, avatar_url, account_type")
            .in("username", usernames)
        : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

      const outfitUserIds = [...new Set((outfits ?? []).map((o) => o.user_id))];
      const { data: outfitProfiles } = outfitUserIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, account_type")
            .in("id", outfitUserIds)
        : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

      if (!active) return;

      const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));
      const profileById = new Map((outfitProfiles ?? []).map((p) => [p.id, p]));

      const productIds = (products ?? []).map((p) => p.id);
      const { data: commentRows } = productIds.length
        ? await supabase.from("comments").select("product_id").in("product_id", productIds)
        : { data: [] as { product_id: number | string }[] };

      if (!active) return;

      const commentCountByProduct = new Map<number | string, number>();
      (commentRows ?? []).forEach((c) => {
        commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
      });

      const enrichedProducts: ProductItem[] = (products ?? []).map((p) => ({
        ...p,
        avatar_url: profileByUsername.get(p.username)?.avatar_url ?? null,
        account_type: profileByUsername.get(p.username)?.account_type ?? null,
        comment_count: commentCountByProduct.get(p.id) ?? 0,
      }));

      const enrichedOutfits: OutfitItem[] = (outfits ?? []).map((o) => ({
        ...o,
        username: profileById.get(o.user_id)?.username ?? "Bilinmeyen kullanıcı",
        avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
        account_type: profileById.get(o.user_id)?.account_type ?? null,
      }));

      const merged: FeedItem[] = [
        ...enrichedProducts.map((p): FeedItem => ({ kind: "product", created_at: p.created_at, data: p })),
        ...enrichedOutfits.map((o): FeedItem => ({ kind: "outfit", created_at: o.created_at, data: o })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFeed(merged);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (!checked || loading) {
    return null;
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center text-center py-12 md:py-24 gap-4">
        <Users size={28} strokeWidth={1} className="text-neutral-300" />
        <p className="text-gray-500">Takip ettiklerini görmek için giriş yap.</p>
        <Link href="/login" className="btn-primary">
          Giriş Yap
        </Link>
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 md:py-24 gap-4">
        <Users size={28} strokeWidth={1} className="text-neutral-300" />
        <p className="text-gray-500">Henüz kimseyi takip etmiyorsun. Toplulukta keşfet!</p>
        <Link href="/" className="btn-primary">
          Tümünü Keşfet
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
      {feed.map((item) =>
        item.kind === "product" ? (
          <ProductCard key={`p-${item.data.id}`} product={item.data} />
        ) : (
          <OutfitCard key={`o-${item.data.id}`} outfit={item.data} />
        )
      )}
    </div>
  );
}
