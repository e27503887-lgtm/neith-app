import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { PostMediaItem } from "@/lib/posts";

function MediaTile({
  item,
  sizes,
  overlayCount,
  priority = false,
}: {
  item: PostMediaItem;
  sizes: string;
  overlayCount?: number;
  priority?: boolean;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden bg-neutral-100">
      {item.type === "video" ? (
        <>
          <video src={item.url} className="absolute inset-0 w-full h-full object-cover" muted preload="none" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-paper">
              <Play size={16} fill="currentColor" />
            </span>
          </span>
        </>
      ) : (
        <Image
          src={item.url}
          alt="Gönderi fotoğrafı"
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      )}
      {overlayCount !== undefined && overlayCount > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-paper font-serif text-2xl">
          +{overlayCount}
        </span>
      )}
    </div>
  );
}

// Twitter-style photo grid: 1 = full width, 2 = side by side, 3 = one tall +
// two stacked, 4+ = 2x2 with a "+n" overlay on the last tile.
export default function PostMediaGrid({
  postId,
  media,
  priority = false,
}: {
  postId: number | string;
  media: PostMediaItem[];
  priority?: boolean;
}) {
  if (media.length === 0) return null;

  const href = `/post/${postId}`;
  // Tema radius token'ları 2px'e düzleştirildiği için köşeler arbitrary değerle
  // yuvarlanıyor; çerçevesiz, Threads tarzı medya bloğu.
  const frame = "block overflow-hidden rounded-[12px]";

  if (media.length === 1) {
    return (
      <Link href={href} className={frame}>
        <div className="relative w-full max-h-[500px] aspect-[4/3]">
          <MediaTile item={media[0]} sizes="(min-width: 768px) 600px, 100vw" priority={priority} />
        </div>
      </Link>
    );
  }

  if (media.length === 2) {
    return (
      <Link href={href} className={`${frame} grid grid-cols-2 gap-0.5`}>
        {media.slice(0, 2).map((item, i) => (
          <div key={i} className="relative aspect-square">
            <MediaTile item={item} sizes="(min-width: 768px) 300px, 50vw" />
          </div>
        ))}
      </Link>
    );
  }

  if (media.length === 3) {
    return (
      <Link href={href} className={`${frame} grid grid-cols-2 gap-0.5`}>
        <div className="relative row-span-2">
          <MediaTile item={media[0]} sizes="(min-width: 768px) 300px, 50vw" />
        </div>
        <div className="relative aspect-square">
          <MediaTile item={media[1]} sizes="(min-width: 768px) 300px, 50vw" />
        </div>
        <div className="relative aspect-square">
          <MediaTile item={media[2]} sizes="(min-width: 768px) 300px, 50vw" />
        </div>
      </Link>
    );
  }

  const extraCount = media.length - 4;
  return (
    <Link href={href} className={`${frame} grid grid-cols-2 gap-0.5`}>
      {media.slice(0, 4).map((item, i) => (
        <div key={i} className="relative aspect-[4/3]">
          <MediaTile
            item={item}
            sizes="(min-width: 768px) 300px, 50vw"
            overlayCount={i === 3 ? extraCount : undefined}
          />
        </div>
      ))}
    </Link>
  );
}
