"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function OutfitLikeButton({ outfitId }: { outfitId: number | string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const { count: totalCount } = await supabase
        .from("outfit_likes")
        .select("*", { count: "exact", head: true })
        .eq("outfit_id", outfitId);

      let alreadyLiked = false;
      if (uid) {
        const { data: existing } = await supabase
          .from("outfit_likes")
          .select("id")
          .eq("outfit_id", outfitId)
          .eq("user_id", uid)
          .maybeSingle();
        alreadyLiked = !!existing;
      }

      if (!active) return;
      setUserId(uid);
      setCount(totalCount ?? 0);
      setLiked(alreadyLiked);
    }

    load();
    return () => {
      active = false;
    };
  }, [outfitId]);

  async function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);

    if (liked) {
      setLiked(false);
      setCount((c) => c - 1);

      const { error } = await supabase
        .from("outfit_likes")
        .delete()
        .eq("outfit_id", outfitId)
        .eq("user_id", userId);

      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setCount((c) => c + 1);

      const { error } = await supabase
        .from("outfit_likes")
        .insert([{ outfit_id: outfitId, user_id: userId }]);

      if (error) {
        setLiked(false);
        setCount((c) => c - 1);
      }
    }

    setBusy(false);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-sm text-gray-600 hover:text-accent transition-colors"
    >
      <Heart
        size={18}
        strokeWidth={1.5}
        className={liked ? "text-accent" : "text-gray-400"}
        fill={liked ? "currentColor" : "none"}
      />
      <span>{count}</span>
    </button>
  );
}
