import Link from "next/link";
import Image from "next/image";
import { Images, Play, ShoppingBag } from "lucide-react";
import BrandBadge from "./BrandBadge";
import PostLikeButton from "./PostLikeButton";

const CAPTION_TRUNCATE_LENGTH = 100;

type Post = {
  id: number | string;
  caption: string | null;
  cover_url: string;
  cover_type: "image" | "video";
  media_count: number;
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
  has_tag?: boolean;
};

export default function PostCard({ post }: { post: Post }) {
  const captionTooLong = (post.caption?.length ?? 0) > CAPTION_TRUNCATE_LENGTH;

  return (
    <article className="card-hover bg-paper border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${post.username}`} className="shrink-0">
          {post.avatar_url ? (
            <Image
              src={post.avatar_url}
              alt={post.username}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {post.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <Link
          href={`/profile/${post.username}`}
          className="flex items-center gap-1 text-xs uppercase tracking-wide font-medium hover:text-accent transition-colors"
        >
          @{post.username}
          {post.account_type === "brand" && <BrandBadge />}
        </Link>
      </div>

      <Link
        href={`/post/${post.id}`}
        className="relative block w-full aspect-[3/4] overflow-hidden bg-neutral-50"
      >
        {post.media_count > 1 && (
          <span className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-paper/90 text-ink">
            <Images size={13} strokeWidth={1.5} />
          </span>
        )}
        {post.has_tag && (
          <span className="absolute bottom-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-paper/90 text-ink">
            <ShoppingBag size={13} strokeWidth={1.5} />
          </span>
        )}
        {post.cover_type === "video" ? (
          <>
            <video src={post.cover_url} className="w-full h-full object-cover" muted />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-paper">
                <Play size={16} fill="currentColor" />
              </span>
            </span>
          </>
        ) : (
          <Image
            src={post.cover_url}
            alt={post.caption ?? "Gönderi"}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out hover:scale-105"
          />
        )}
      </Link>

      {post.caption && (
        <div className="px-3 pt-2">
          <p className="text-sm text-ink line-clamp-2">{post.caption}</p>
          {captionTooLong && (
            <Link
              href={`/post/${post.id}`}
              className="text-xs text-gray-500 hover:text-accent transition-colors"
            >
              devamını gör
            </Link>
          )}
        </div>
      )}

      <div className="p-3">
        <PostLikeButton postId={post.id} />
      </div>
    </article>
  );
}
