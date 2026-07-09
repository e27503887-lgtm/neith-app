"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductCard from "./ProductCard";
import OutfitCard from "./OutfitCard";
import PostCard from "./PostCard";
import { supabase } from "../utils/supabase";
import { enrichPostsWithMedia } from "@/lib/posts";

const BATCH_SIZE = 10;

type ProfileLite = {
  id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

type FeedItem =
  | { kind: "product"; created_at: string; data: Parameters<typeof ProductCard>[0]["product"] }
  | { kind: "outfit"; created_at: string; data: Parameters<typeof OutfitCard>[0]["outfit"] }
  | { kind: "post"; created_at: string; data: Parameters<typeof PostCard>[0]["post"] & { created_at: string } };

// Sunucunun render ettiği ilk sayfanın devamı: sentinel görünür olunca
// cursor'dan (en eski gösterilen tarih) geriye doğru yeni bir parti çeker.
export default function FeedLoadMore({
  initialCursor,
  variant,
}: {
  initialCursor: string | null;
  variant: "list" | "grid";
}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialCursor === null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(cursor);
  const loadingRef = useRef(loading);
  const doneRef = useRef(done);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
  useEffect(() => {
    doneRef.current = done;
  }, [done]);

  const loadMore = useCallback(async () => {
    const before = cursorRef.current;
    if (!before || loadingRef.current || doneRef.current) return;

    setLoading(true);

    const [{ data: products }, { data: outfits }, { data: postsRaw }] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .lt("created_at", before)
        .order("created_at", { ascending: false })
        .limit(BATCH_SIZE),
      supabase
        .from("outfits")
        .select("*")
        .lt("created_at", before)
        .order("created_at", { ascending: false })
        .limit(BATCH_SIZE),
      supabase
        .from("posts")
        .select("*")
        .lt("created_at", before)
        .order("created_at", { ascending: false })
        .limit(BATCH_SIZE),
    ]);

    const enrichedPosts = await enrichPostsWithMedia(postsRaw ?? [], { includeLikes: false });

    const userIds = [
      ...new Set([
        ...(outfits ?? []).map((o) => o.user_id),
        ...enrichedPosts.map((p) => p.user_id),
      ]),
    ];
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, avatar_url, account_type")
          .in("id", userIds)
      : { data: [] as ProfileLite[] };

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const merged: FeedItem[] = [
      ...(products ?? []).map(
        (p): FeedItem => ({ kind: "product", created_at: p.created_at, data: p })
      ),
      ...(outfits ?? []).map(
        (o): FeedItem => ({
          kind: "outfit",
          created_at: o.created_at,
          data: {
            ...o,
            username: profileById.get(o.user_id)?.username ?? "Bilinmeyen kullanıcı",
            avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
            account_type: profileById.get(o.user_id)?.account_type ?? null,
          },
        })
      ),
      ...enrichedPosts.map(
        (p): FeedItem => ({
          kind: "post",
          created_at: p.created_at,
          data: {
            ...p,
            username: profileById.get(p.user_id)?.username ?? "Bilinmeyen kullanıcı",
            avatar_url: profileById.get(p.user_id)?.avatar_url ?? null,
            account_type: profileById.get(p.user_id)?.account_type ?? null,
          },
        })
      ),
    ]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, BATCH_SIZE);

    if (merged.length === 0) {
      setDone(true);
      setLoading(false);
      return;
    }

    setItems((prev) => [...prev, ...merged]);
    setCursor(merged[merged.length - 1].created_at);
    if (merged.length < BATCH_SIZE) setDone(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const rendered = items.map((item) =>
    item.kind === "product" ? (
      <ProductCard key={`lm-p-${item.data.id}`} product={item.data} />
    ) : item.kind === "outfit" ? (
      <OutfitCard key={`lm-o-${item.data.id}`} outfit={item.data} />
    ) : (
      <PostCard key={`lm-post-${item.data.id}`} post={item.data} />
    )
  );

  return (
    <>
      {variant === "grid" ? (
        items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mt-4 md:mt-6">
            {rendered}
          </div>
        )
      ) : (
        items.length > 0 && <div className="flex flex-col gap-6 mt-6">{rendered}</div>
      )}

      <div ref={sentinelRef} className="h-10" />
      {loading && <p className="text-center text-xs text-gray-400 py-4">Yükleniyor...</p>}
      {done && items.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">Akışın sonuna geldin.</p>
      )}
    </>
  );
}
