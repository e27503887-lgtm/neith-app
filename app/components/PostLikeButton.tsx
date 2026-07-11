"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function PostLikeButton({ postId }: { postId: number | string }) {
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
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      let alreadyLiked = false;
      if (uid) {
        const { data: existing } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
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
  }, [postId]);

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
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) {
        setLiked(true);
        setCount((c) => c + 1);
      }
    } else {
      setLiked(true);
      setCount((c) => c + 1);

      const { error } = await supabase
        .from("post_likes")
        .insert([{ post_id: postId, user_id: userId }]);

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
        className={`${liked ? "text-accent" : "text-gray-500"} ${popping ? "animate-pop" : ""}`}
        fill={liked ? "currentColor" : "none"}
      />
      <span>{count}</span>
    </button>
  );
}
