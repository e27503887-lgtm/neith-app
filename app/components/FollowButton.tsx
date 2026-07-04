"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function FollowButton({
  targetUserId,
  compact = false,
}: {
  targetUserId: string;
  compact?: boolean;
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
      }
    }

    setBusy(false);
    router.refresh();
  }

  const sizeClasses = compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={busy}
      className={`${sizeClasses} rounded-md font-medium disabled:opacity-50 ${
        following
          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
          : "bg-black text-white hover:bg-gray-800"
      }`}
    >
      {following ? (hovering ? "Takibi Bırak" : "Takiptesin") : "Takip Et"}
    </button>
  );
}
