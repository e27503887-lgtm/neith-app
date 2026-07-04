"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function FollowButton({
  targetUserId,
  compact = false,
  onFollow,
}: {
  targetUserId: string;
  compact?: boolean;
  onFollow?: () => void;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;

      if (!active) return;
      setCurrentUserId(uid);

      if (uid && uid !== targetUserId) {
        const { data: existing } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", uid)
          .eq("following_id", targetUserId)
          .maybeSingle();

        if (!active) return;
        setFollowing(!!existing);
      }

      setChecked(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  if (!checked || currentUserId === targetUserId) {
    return null;
  }

  async function handleClick() {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);

    if (following) {
      setFollowing(false);

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (error) {
        setFollowing(true);
      }
    } else {
      setFollowing(true);

      const { error } = await supabase
        .from("follows")
        .insert([{ follower_id: currentUserId, following_id: targetUserId }]);

      if (error) {
        setFollowing(false);
      } else {
        onFollow?.();
      }
    }

    setBusy(false);
    router.refresh();
  }

  const sizeClasses = compact ? "px-3 py-1 text-[11px]" : "px-4 py-1.5 text-xs";

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={busy}
      className={`${sizeClasses} uppercase tracking-wide font-medium border transition-colors duration-300 disabled:opacity-50 ${
        following
          ? "border-neutral-300 text-gray-600 hover:border-accent hover:text-accent"
          : "border-ink text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {following ? (hovering ? "Takibi Bırak" : "Takiptesin") : "Takip Et"}
    </button>
  );
}
