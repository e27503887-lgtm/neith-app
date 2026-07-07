"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BrandBadge from "./BrandBadge";
import BadgeChips from "./BadgeChips";
import FollowButton from "./FollowButton";
import StartChatButton from "./StartChatButton";
import { supabase } from "../utils/supabase";

type Props = {
  userId: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  productCount: number;
  followerCount: number;
  joinedLabel: string;
  badgeKeys?: string[];
};

export default function BrandProfileHeader({
  userId,
  username,
  avatar_url,
  banner_url,
  bio,
  productCount,
  followerCount,
  joinedLabel,
  badgeKeys = [],
}: Props) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === userId);
    });
  }, [userId]);

  const identity = (
    <div className="flex items-end gap-4">
      <div className="relative w-20 h-20 md:w-28 md:h-28 shrink-0 translate-y-6 md:translate-y-8">
        <div className="w-full h-full rounded-full overflow-hidden border-4 border-paper shadow-xl bg-neutral-200 relative">
          {avatar_url ? (
            <Image src={avatar_url} alt={username} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-semibold text-gray-600">
              {username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <div className="pb-2 md:pb-3 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl md:text-4xl text-white tracking-tight truncate drop-shadow-sm">
            {username}
          </h1>
          <span className="bg-paper rounded-full p-0.5 flex items-center justify-center shrink-0">
            <BrandBadge />
          </span>
        </div>
        <BadgeChips badgeKeys={badgeKeys} variant="dark" />
      </div>
    </div>
  );

  return (
    <div>
      <div className="relative w-full aspect-[16/5] bg-neutral-100">
        {banner_url ? (
          <Image src={banner_url} alt={`${username} banner`} fill priority className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-neutral-100" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute left-6 md:left-10 bottom-4 md:bottom-6">
          {isOwner ? (
            <Link href="/profile/edit" title="Profili Düzenle">
              {identity}
            </Link>
          ) : (
            identity
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-10 md:pt-12 pb-6 border-b border-neutral-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm text-gray-600 leading-6">
              {bio || "Bu markanın henüz bir tanıtımı yok."}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">
              {productCount} ürün · {followerCount} takipçi · Katılım: {joinedLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FollowButton targetUserId={userId} />
            <StartChatButton otherUserId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}
