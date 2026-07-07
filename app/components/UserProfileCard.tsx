"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BrandBadge from "./BrandBadge";
import BadgeChips from "./BadgeChips";
import FollowStats from "./FollowStats";
import { supabase } from "../utils/supabase";

type OutfitPreview = {
  id: string;
  title: string;
  image_url: string;
};

type Props = {
  userId: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
  account_type: string | null;
  badgeKeys?: string[];
  followerCount: number;
  followingCount: number;
  outfits: OutfitPreview[];
};

export default function UserProfileCard({
  userId,
  username,
  avatar_url,
  bio,
  account_type,
  badgeKeys = [],
  followerCount,
  followingCount,
  outfits,
}: Props) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === userId);
    });
  }, [userId]);

  const identity = (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-xl bg-gray-100">
        {avatar_url ? (
          <Image src={avatar_url} alt={username} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-gray-600 bg-gray-100">
            {username?.[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-serif tracking-tight text-ink">{username}</h2>
          {account_type === "brand" && <BrandBadge />}
        </div>
        <BadgeChips badgeKeys={badgeKeys} />
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">{bio ?? "Moda, stil ve ilham odaklı bir profil."}</p>
      </div>
    </div>
  );

  return (
    <section className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
      <div className="relative overflow-hidden bg-ink/5 p-7">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-amber-100 opacity-60 pointer-events-none" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {isOwner ? (
            <Link href="/profile/edit" title="Profili Düzenle" className="group">
              {identity}
            </Link>
          ) : (
            identity
          )}

          <FollowStats
            userId={userId}
            followerCount={followerCount}
            followingCount={followingCount}
            variant="stat"
          />
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-gray-500">Paylaşılan Kombinler</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Öne çıkan üç kombin</h3>
          </div>
          <Link
            href={`/profile/${username}#outfits`}
            className="text-sm font-medium text-ink hover:text-accent transition-colors"
          >
            Tümünü gör →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {outfits.slice(0, 3).map((outfit) => (
            <Link
              key={outfit.id}
              href={`/outfit/${outfit.id}`}
              className="group block overflow-hidden rounded-3xl border border-neutral-200 bg-ink/5 transition-shadow hover:shadow-lg"
            >
              <div className="relative h-56 overflow-hidden bg-gray-100">
                <Image src={outfit.image_url} alt={outfit.title} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-ink">{outfit.title}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-gray-500">Yeni</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
