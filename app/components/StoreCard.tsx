"use client";

import Link from "next/link";
import Image from "next/image";
import { Store as StoreIcon } from "lucide-react";
import BrandBadge from "./BrandBadge";
import FollowButton from "./FollowButton";

export type StoreCardData = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  recentProducts: { id: number | string; image_url: string }[];
  productCount: number;
  followerCount: number;
};

export default function StoreCard({
  store,
  onFollow,
  onUnfollow,
}: {
  store: StoreCardData;
  onFollow?: () => void;
  onUnfollow?: () => void;
}) {
  return (
    <div className="card-hover group bg-paper border border-neutral-200 overflow-hidden flex flex-col">
      <Link href={`/profile/${store.username}`} className="block">
        <div className="grid grid-cols-3 gap-px bg-neutral-200">
          {[0, 1, 2].map((i) => {
            const product = store.recentProducts[i];
            return (
              <div key={i} className="relative aspect-square bg-neutral-100 overflow-hidden">
                {product ? (
                  <Image
                    src={product.image_url}
                    alt={store.username}
                    fill
                    sizes="(min-width: 1024px) 11vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <StoreIcon size={18} strokeWidth={1} className="text-neutral-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Link>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <Link href={`/profile/${store.username}`} className="flex items-center gap-3">
          {store.avatar_url ? (
            <Image
              src={store.avatar_url}
              alt={store.username}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
              {store.username?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="flex items-center gap-1 text-sm font-medium text-ink hover:text-accent transition-colors truncate">
            <span className="truncate">{store.username}</span>
            <BrandBadge />
          </span>
        </Link>

        {store.bio && <p className="text-xs text-gray-500 leading-5 line-clamp-2">{store.bio}</p>}

        <p className="text-xs text-gray-500 mt-auto">
          {store.productCount} ürün · {store.followerCount} takipçi
        </p>

        <div className="flex items-center gap-2">
          <FollowButton targetUserId={store.id} compact onFollow={onFollow} onUnfollow={onUnfollow} />
          <Link
            href={`/profile/${store.username}`}
            className="text-[11px] uppercase tracking-wide font-medium border border-neutral-300 text-gray-600 px-3 py-1 hover:border-ink hover:text-ink transition-colors shrink-0"
          >
            Mağazayı Ziyaret Et
          </Link>
        </div>
      </div>
    </div>
  );
}
