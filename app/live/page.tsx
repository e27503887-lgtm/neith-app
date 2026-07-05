"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, X, Shirt } from "lucide-react";
import { supabase } from "../utils/supabase";
import { STYLE_TAGS } from "@/lib/styleTags";
import OutfitLikeButton from "../components/OutfitLikeButton";
import SaveButton from "../components/SaveButton";
import CommentSection from "../components/CommentSection";
import BrandBadge from "../components/BrandBadge";

const PAGE_SIZE = 6;

type LiveOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
  comment_count: number;
};

export default function LivePage() {
  const [activeTag, setActiveTag] = useState<string>("all");
  const [outfits, setOutfits] = useState<LiveOutfit[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | number | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadPage = useCallback(async (tag: string, pageIndex: number) => {
    setLoading(true);

    let query = supabase
      .from("outfits")
      .select("id, title, image_url, style_tag, user_id, created_at")
      .order("created_at", { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

    if (tag !== "all") {
      query = query.eq("style_tag", tag);
    }

    const { data: rows } = await query;
    const batch = rows ?? [];

    const userIds = [...new Set(batch.map((o) => o.user_id))];
    const outfitIds = batch.map((o) => o.id);

    const [{ data: profiles }, { data: commentRows }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, username, avatar_url, account_type").in("id", userIds)
        : Promise.resolve({
            data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[],
          }),
      outfitIds.length
        ? supabase.from("comments").select("outfit_id").in("outfit_id", outfitIds)
        : Promise.resolve({ data: [] as { outfit_id: number | string }[] }),
    ]);

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const commentCountByOutfit = new Map<number | string, number>();
    (commentRows ?? []).forEach((c) => {
      commentCountByOutfit.set(c.outfit_id, (commentCountByOutfit.get(c.outfit_id) ?? 0) + 1);
    });

    const enriched: LiveOutfit[] = batch.map((o) => ({
      id: o.id,
      title: o.title,
      image_url: o.image_url,
      style_tag: o.style_tag,
      username: profileById.get(o.user_id)?.username ?? "Bilinmeyen kullanıcı",
      avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
      account_type: profileById.get(o.user_id)?.account_type ?? null,
      comment_count: commentCountByOutfit.get(o.id) ?? 0,
    }));

    setOutfits((prev) => (pageIndex === 0 ? enriched : [...prev, ...enriched]));
    setHasMore(batch.length === PAGE_SIZE);
    setLoading(false);
  }, []);

  // Reset & load the first page whenever the style filter changes.
  useEffect(() => {
    setOutfits([]);
    setHasMore(true);
    setPage(0);
    loadPage(activeTag, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag]);

  // Infinite scroll: watch the sentinel and fetch the next page.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current && !loadingRef.current) {
          setPage((prev) => {
            const next = prev + 1;
            loadPage(activeTag, next);
            return next;
          });
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [activeTag, loadPage]);

  const filters = ["all", ...STYLE_TAGS];

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16">
      <div className="max-w-xl mx-auto px-6">
        <div className="mb-8 border-b border-neutral-200 pb-6">
          <p className="section-label mb-2">Canlı Akış</p>
          <h1 className="font-serif text-3xl text-ink tracking-tight">Kombin Akışı</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
          {filters.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`shrink-0 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                activeTag === tag
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              {tag === "all" ? "Tümü" : `Sadece ${tag}`}
            </button>
          ))}
        </div>

        {outfits.length === 0 && !loading ? (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <Shirt size={28} strokeWidth={1} className="text-neutral-300" />
            <p className="text-gray-500 text-sm">Bu stille paylaşılmış bir kombin yok.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {outfits.map((outfit) => (
              <article key={outfit.id}>
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/profile/${outfit.username}`} className="shrink-0">
                    {outfit.avatar_url ? (
                      <Image
                        src={outfit.avatar_url}
                        alt={outfit.username}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {outfit.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <Link
                    href={`/profile/${outfit.username}`}
                    className="flex items-center gap-1 text-sm font-medium hover:text-accent transition-colors"
                  >
                    @{outfit.username}
                    {outfit.account_type === "brand" && <BrandBadge />}
                  </Link>

                  {outfit.style_tag && (
                    <span className="ml-auto text-[11px] uppercase tracking-[0.16em] text-gray-500 border border-neutral-300 px-2 py-0.5">
                      {outfit.style_tag}
                    </span>
                  )}
                </div>

                <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-50">
                  <Link href={`/outfit/${outfit.id}`} className="absolute inset-0 block">
                    <Image
                      src={outfit.image_url}
                      alt={outfit.title}
                      fill
                      sizes="(min-width: 640px) 576px, 100vw"
                      className="object-cover"
                    />
                  </Link>

                  {/* Comment drawer — overlays the image only, never the full page. */}
                  <div
                    className={`absolute inset-x-0 bottom-0 z-10 bg-paper border-t border-neutral-200 shadow-[0_-4px_24px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-out ${
                      openCommentsFor === outfit.id ? "translate-y-0" : "translate-y-full"
                    }`}
                    style={{ height: "72%" }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
                      <span className="font-serif text-lg text-ink">Yorumlar</span>
                      <button
                        onClick={() => setOpenCommentsFor(null)}
                        className="text-gray-400 hover:text-ink transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="h-[calc(100%-53px)] overflow-y-auto p-4">
                      {openCommentsFor === outfit.id && <CommentSection outfitId={outfit.id} />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-3">
                  <OutfitLikeButton outfitId={outfit.id} />
                  <button
                    onClick={() =>
                      setOpenCommentsFor((prev) => (prev === outfit.id ? null : outfit.id))
                    }
                    className="flex items-center gap-1 text-gray-400 hover:text-accent transition-colors"
                  >
                    <MessageCircle size={19} strokeWidth={1.5} />
                    <span className="text-sm">{outfit.comment_count}</span>
                  </button>
                  <div className="ml-auto">
                    <SaveButton outfitId={outfit.id} />
                  </div>
                </div>

                <p className="text-sm text-ink mt-2">{outfit.title}</p>
              </article>
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="h-10" />

        {loading && <p className="text-center text-xs text-gray-400 py-6">Yükleniyor...</p>}

        {!hasMore && !loading && outfits.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-6">Akışın sonuna geldin.</p>
        )}
      </div>
    </main>
  );
}
