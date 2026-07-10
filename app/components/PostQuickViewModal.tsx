"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Link as LinkIcon, X } from "lucide-react";
import BrandBadge from "./BrandBadge";
import { supabase } from "../utils/supabase";
import { timeAgo } from "@/lib/relativeTime";

type QuickViewPost = {
  caption: string | null;
  created_at: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
  media: { url: string; type: "image" | "video" }[];
};

// Paylaş ikonundan açılan hızlı görünüm: sayfa değiştirmeden gönderi/kombin
// detayını ekranın ortasında gösterir. Veriyi açılınca kendisi çeker, bu
// yüzden akışta ve detay sayfasında aynı şekilde çalışır.
export default function PostQuickViewModal({
  postId,
  onClose,
}: {
  postId: number | string;
  onClose: () => void;
}) {
  const [post, setPost] = useState<QuickViewPost | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: postRow }, { data: mediaRows }] = await Promise.all([
        supabase.from("posts").select("caption, created_at, user_id").eq("id", postId).single(),
        supabase
          .from("post_media")
          .select("media_url, media_type")
          .eq("post_id", postId)
          .order("position", { ascending: true }),
      ]);

      const { data: owner } = postRow
        ? await supabase
            .from("profiles")
            .select("username, avatar_url, account_type")
            .eq("id", postRow.user_id)
            .single()
        : { data: null };

      if (!active) return;
      setPost({
        caption: postRow?.caption ?? null,
        created_at: postRow?.created_at ?? "",
        username: owner?.username ?? "Bilinmeyen kullanıcı",
        avatar_url: owner?.avatar_url ?? null,
        account_type: owner?.account_type ?? null,
        media: (mediaRows ?? []).map((m) => ({ url: m.media_url, type: m.media_type })),
      });
    }

    load();
    return () => {
      active = false;
    };
  }, [postId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleShareLink() {
    const url = `${window.location.origin}/post/${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Pano erişimi yoksa sessizce geç.
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gönderi önizlemesi"
        className="relative w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-paper border border-neutral-200 rounded-[16px] shadow-xl animate-fade-in"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
          <span className="text-xs uppercase tracking-[0.24em] text-gray-500">Hızlı Görünüm</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-gray-500 hover:text-ink transition-colors"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {!post ? (
          <div className="p-5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-200" />
              <div className="h-3 w-28 bg-neutral-200 rounded" />
            </div>
            <div className="mt-4 h-3 w-3/4 bg-neutral-200 rounded" />
            <div className="mt-3 w-full aspect-[4/3] bg-neutral-200 rounded-[12px]" />
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center gap-3">
              <Link href={`/profile/${post.username}`} className="shrink-0" onClick={onClose}>
                {post.avatar_url ? (
                  <Image
                    src={post.avatar_url}
                    alt={post.username}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 border border-neutral-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {post.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </Link>
              <div className="min-w-0">
                <Link
                  href={`/profile/${post.username}`}
                  onClick={onClose}
                  className="flex items-center gap-1.5 hover:text-accent transition-colors"
                >
                  <span className="truncate font-sans text-sm font-medium text-ink">
                    {post.username}
                  </span>
                  {post.account_type === "brand" && <BrandBadge />}
                </Link>
                {post.created_at && (
                  <p className="text-xs text-gray-400" suppressHydrationWarning>
                    {timeAgo(post.created_at)}
                  </p>
                )}
              </div>
            </div>

            {post.caption && (
              <p className="mt-3 font-sans text-[15px] leading-[1.5] text-ink whitespace-pre-wrap">
                {post.caption}
              </p>
            )}

            {post.media.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {post.media.map((item, i) =>
                  item.type === "video" ? (
                    <video
                      key={i}
                      src={item.url}
                      controls
                      className="w-full rounded-[12px] bg-neutral-100"
                    />
                  ) : (
                    <div key={i} className="relative w-full overflow-hidden rounded-[12px] bg-neutral-100">
                      <Image
                        src={item.url}
                        alt="Gönderi fotoğrafı"
                        width={1024}
                        height={768}
                        sizes="(min-width: 768px) 512px, 100vw"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-200 pt-3">
              <button
                type="button"
                onClick={handleShareLink}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-accent transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} strokeWidth={1.5} className="text-accent" />
                    <span className="text-accent">Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} strokeWidth={1.5} />
                    Bağlantıyı paylaş
                  </>
                )}
              </button>
              <Link href={`/post/${postId}`} onClick={onClose} className="btn-primary">
                Gönderiye Git
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
