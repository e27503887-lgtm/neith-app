"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function LikeButton({
  productId,
  className,
  showCount = true,
  iconSize = 18,
}: {
  productId: number | string;
  className?: string;
  showCount?: boolean;
  iconSize?: number;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const { count: totalCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId);

      let alreadyLiked = false;
      if (uid) {
        const { data: existing } = await supabase
          .from("likes")
          .select("id")
          .eq("product_id", productId)
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
  }, [productId]);

  async function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 200);

    if (liked) {
      setLiked(false);
      setCount((c) => c - 1);

      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", userId);

      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setCount((c) => c + 1);

      const { error } = await supabase
        .from("likes")
        .insert([{ product_id: productId, user_id: userId }]);

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
      className={`flex items-center gap-1 text-sm text-gray-600 transition-colors hover:text-accent ${className ?? ""}`}
    >
      <Heart
        size={iconSize}
        strokeWidth={1.5}
        className={`${liked ? "text-accent" : "text-gray-400"} ${popping ? "animate-pop" : ""}`}
        fill={liked ? "currentColor" : "none"}
      />
      {showCount && <span>{count}</span>}
    </button>
  );
}
