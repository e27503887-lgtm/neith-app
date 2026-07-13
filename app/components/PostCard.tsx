"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import BrandBadge from "./BrandBadge";
import PostMenu from "./PostMenu";
import PostActionBar from "./PostActionBar";
import PostMediaGrid from "./PostMediaGrid";
import { timeAgo } from "@/lib/relativeTime";
import type { PostMediaItem } from "@/lib/posts";

const CAPTION_CLAMP_CHARS = 220;
const CAPTION_CLAMP_LINES = 4;

type Post = {
  id: number | string;
  caption: string | null;
  cover_url: string;
  cover_type: "image" | "video";
  media_count: number;
  media?: PostMediaItem[];
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
  user_id?: string;
  created_at?: string;
  has_tag?: boolean;
};

// X / Threads hibrit akış kartı: solda sabit avatar sütunu; kullanıcı adı,
// metin, görsel ve etkileşim satırı sağda tek içerik bloğu halinde.
export default function PostCard({
  post,
  onDeleted,
  priority = false,
}: {
  post: Post;
  onDeleted?: () => void;
  priority?: boolean;
}) {
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  const media: PostMediaItem[] =
    post.media ??
    (post.cover_url ? [{ url: post.cover_url, type: post.cover_type }] : []);

  const caption = post.caption ?? "";
  const captionTooLong =
    caption.length > CAPTION_CLAMP_CHARS ||
    caption.split("\n").length > CAPTION_CLAMP_LINES;

  return (
    <article className="w-full border-b border-[#e1e1e1] px-4 py-5 md:hover:bg-zinc-50 transition-colors">
      <div className="flex gap-3">
        <Link href={`/profile/${post.username}`} className="shrink-0">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${post.username}`}
              className="flex min-w-0 items-center gap-1.5 hover:text-accent transition-colors"
            >
              <span className="truncate font-sans text-sm font-medium text-ink">
                {post.username}
              </span>
              {post.account_type === "brand" && <BrandBadge />}
            </Link>

            <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-gray-500">
              {post.has_tag && <ShoppingBag size={11} strokeWidth={1.5} />}
              {/* Relatif zaman sunucu ve istemcide saniye farkıyla değişebilir —
                  hydration uyuşmazlığı uyarısını bastır. */}
              {post.created_at && (
                <span suppressHydrationWarning>{timeAgo(post.created_at)}</span>
              )}
              {post.user_id && (
                <PostMenu
                  postId={post.id}
                  ownerId={post.user_id}
                  onDeleted={() => {
                    setDeleted(true);
                    onDeleted?.();
                  }}
                />
              )}
            </span>
          </div>

          {caption && (
            <div className="mt-0.5">
              <Link href={`/post/${post.id}`} className="block">
                <p
                  className={`font-sans text-[15px] leading-[1.5] text-ink whitespace-pre-wrap ${
                    captionTooLong ? "line-clamp-4" : ""
                  }`}
                >
                  {caption}
                </p>
              </Link>
              {captionTooLong && (
                <Link
                  href={`/post/${post.id}`}
                  className="text-sm text-accent hover:underline underline-offset-4 transition-colors"
                >
                  devamını gör
                </Link>
              )}
            </div>
          )}

          {media.length > 0 && (
            <div className="mt-2">
              <PostMediaGrid postId={post.id} media={media} priority={priority} />
            </div>
          )}

          <PostActionBar postId={post.id} />
        </div>
      </div>
    </article>
  );
}
