"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import FollowButton from "./FollowButton";
import BrandBadge from "./BrandBadge";
import { supabase } from "../utils/supabase";

const POOL_SIZE = 10;
const VISIBLE_COUNT = 5;
const FADE_MS = 300;

type Candidate = {
  id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
  followerCount: number;
  size_top?: string | null;
  size_bottom?: string | null;
  size_shoe?: number | null;
  style_tags?: string[];
  show_sizes?: boolean;
};

export default function SuggestedUsers({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) {
  const [loaded, setLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [twinPromoProfile, setTwinPromoProfile] = useState<Candidate | null>(null);
  const [fadingIds, setFadingIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const [{ data: profiles }, { data: follows }, { data: products }, { data: outfits }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, username, avatar_url, account_type, size_top, size_bottom, size_shoe, style_tags, show_sizes"
            ),
          supabase.from("follows").select("follower_id, following_id"),
          supabase.from("products").select("user_id, created_at"),
          supabase.from("outfits").select("user_id, created_at"),
        ]);

      if (!active) return;

      const followerCountById = new Map<string, number>();
      const followingIdsOfCurrentUser = new Set<string>();
      (follows ?? []).forEach((f) => {
        followerCountById.set(f.following_id, (followerCountById.get(f.following_id) ?? 0) + 1);
        if (uid && f.follower_id === uid) {
          followingIdsOfCurrentUser.add(f.following_id);
        }
      });

      const lastActivityById = new Map<string, string>();
      const registerActivity = (userIdValue: string | null, createdAt: string) => {
        if (!userIdValue) return;
        const existing = lastActivityById.get(userIdValue);
        if (!existing || new Date(createdAt).getTime() > new Date(existing).getTime()) {
          lastActivityById.set(userIdValue, createdAt);
        }
      };
      (products ?? []).forEach((p) => registerActivity(p.user_id, p.created_at));
      (outfits ?? []).forEach((o) => registerActivity(o.user_id, o.created_at));

      const currentUserProfile = (profiles ?? []).find((p) => p.id === uid);
      const rankedFull = (profiles ?? [])
        .filter((p) => p.id !== uid && !followingIdsOfCurrentUser.has(p.id))
        .map((p) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          account_type: p.account_type,
          followerCount: followerCountById.get(p.id) ?? 0,
          lastActivity: lastActivityById.get(p.id) ?? "",
          size_top: p.size_top,
          size_bottom: p.size_bottom,
          size_shoe: p.size_shoe,
          style_tags: p.style_tags ?? [],
          show_sizes: p.show_sizes ?? true,
        }))
        .sort((a, b) => {
          if (b.followerCount !== a.followerCount) return b.followerCount - a.followerCount;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        })
        .slice(0, POOL_SIZE);

      const ranked = rankedFull.map(({ id, username, avatar_url, account_type, followerCount }) => ({
        id,
        username,
        avatar_url,
        account_type,
        followerCount,
      }));

      const twinPromo = (() => {
        if (!uid || !currentUserProfile || !currentUserProfile.show_sizes) return null;
        if (
          !currentUserProfile.size_top ||
          !currentUserProfile.size_bottom ||
          currentUserProfile.size_shoe === null ||
          currentUserProfile.style_tags?.length === 0
        ) {
          return null;
        }

        const candidateMatches = rankedFull
          .filter((p) => p.show_sizes)
          .map((p) => {
            let score = 0;
            if (p.size_top && p.size_top === currentUserProfile.size_top) score += 3;
            if (p.size_bottom && p.size_bottom === currentUserProfile.size_bottom) score += 3;
            if (
              p.size_shoe !== undefined &&
              currentUserProfile.size_shoe !== null &&
              Math.abs((p.size_shoe ?? 0) - currentUserProfile.size_shoe) <= 1
            ) {
              score += 2;
            }
            const sharedStyleCount = (p.style_tags ?? []).filter((tag: string) =>
              currentUserProfile.style_tags?.includes(tag)
            ).length;
            score += sharedStyleCount * 2;
            return { profile: p, score };
          })
          .filter((item) => item.score >= 5)
          .sort((a, b) => b.score - a.score);

        return candidateMatches[0]?.profile ?? null;
      })();

      setCurrentUserId(uid);
      setTwinPromoProfile(twinPromo);
      setCandidates(ranked);
      setLoaded(true);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function handleFollowed(id: string) {
    setFadingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setDismissedIds((prev) => new Set(prev).add(id));
    }, FADE_MS);
  }

  if (!loaded) {
    return null;
  }

  const visible = candidates.filter((c) => !dismissedIds.has(c.id)).slice(0, VISIBLE_COUNT);

  if (visible.length === 0 && !twinPromoProfile) {
    return null;
  }

  const row = (user: Candidate) => {
    const fading = fadingIds.has(user.id);
    return (
      <div
        key={user.id}
        className={`flex items-center gap-3 transition-opacity duration-300 ${
          fading ? "opacity-0" : "opacity-100"
        } ${variant === "mobile" ? "shrink-0 w-[70vw] sm:w-56 snap-start bg-paper border border-neutral-200 p-3" : ""}`}
      >
        <Link href={`/profile/${user.username}`} className="shrink-0">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.username}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {user.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${user.username}`}
            className="flex items-center gap-1 text-sm font-medium hover:text-accent transition-colors truncate"
          >
            <span className="truncate">@{user.username}</span>
            {user.account_type === "brand" && <BrandBadge />}
          </Link>
          <p className="text-xs text-gray-500">{user.followerCount} takipçi</p>
        </div>

        {currentUserId ? (
          <FollowButton
            targetUserId={user.id}
            compact
            onFollow={() => handleFollowed(user.id)}
          />
        ) : (
          <Link
            href="/login"
            title="Takip etmek için giriş yap"
            className="text-[11px] uppercase tracking-wide font-medium border border-ink text-ink px-3 py-1 hover:bg-ink hover:text-paper transition-colors duration-300 shrink-0"
          >
            Takip Et
          </Link>
        )}
      </div>
    );
  };

  if (variant === "mobile") {
    return (
      <section>
        <h3 className="section-label mb-3">Keşfedilecek Stiller</h3>
        {twinPromoProfile && (
          <Link
            href="/twins"
            className="mb-4 block rounded-3xl border border-ink/10 bg-ink/5 p-4 transition hover:border-ink hover:bg-ink/10"
          >
            <p className="text-sm">👯 Stil ikizin @{twinPromoProfile.username} gardırobunu satıyor</p>
            <p className="mt-2 text-xs text-gray-600">Twins sayfasına gidip daha fazla ikiz adayı gör.</p>
          </Link>
        )}
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">{visible.map(row)}</div>
      </section>
    );
  }

  return (
    <div className="bg-paper border border-neutral-200 p-4">
      {twinPromoProfile && (
        <Link
          href="/twins"
          className="mb-4 block rounded-3xl border border-ink/10 bg-ink/5 p-4 transition hover:border-ink hover:bg-ink/10"
        >
          <p className="text-sm">👯 Stil ikizin @{twinPromoProfile.username} gardırobunu satıyor</p>
          <p className="mt-2 text-xs text-gray-600">Twins sayfasına gidip daha fazla ikiz adayı gör.</p>
        </Link>
      )}
      <h3 className="section-label mb-3">Keşfedilecek Stiller</h3>
      <div className="flex flex-col gap-3">{visible.map(row)}</div>
    </div>
  );
}
