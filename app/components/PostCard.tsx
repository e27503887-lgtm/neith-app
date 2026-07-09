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

export default function PostCard({
  post,
  onDeleted,
}: {
  post: Post;
  onDeleted?: () => void;
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
  const textOnly = media.length === 0;

  return (
    <article className="w-full border-b border-neutral-200 px-4 py-3.5 md:hover:bg-neutral-50 transition-colors">
      <div className="flex items-start gap-3">
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
          <Link
            href={`/profile/${post.username}`}
            className="flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            <span className="truncate text-sm font-medium text-ink">{post.username}</span>
            {post.account_type === "brand" && <BrandBadge />}
          </Link>
          <p className="flex items-center gap-1.5 text-xs text-gray-400">
            {post.created_at && <span>{timeAgo(post.created_at)}</span>}
            {post.has_tag && <ShoppingBag size={11} strokeWidth={1.5} />}
          </p>
        </div>

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
      </div>

      {caption && (
        <div className="mt-2">
          <Link href={`/post/${post.id}`} className="block">
            <p
              className={`${textOnly ? "text-[16px]" : "text-[15px]"} leading-relaxed text-ink whitespace-pre-wrap ${
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
        <div className="mt-3">
          <PostMediaGrid postId={post.id} media={media} />
        </div>
      )}

      <PostActionBar postId={post.id} />
    </article>
  );
}
