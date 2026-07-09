"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Share2, Check } from "lucide-react";
import { supabase } from "../utils/supabase";

// İnce üst çizgiyle ayrılmış etkileşim satırı: kalp, yorum balonu, paylaş.
export default function PostActionBar({
  postId,
  commentCount = 0,
}: {
  postId: number | string;
  commentCount?: number;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState(false);
  const [shared, setShared] = useState(false);

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

  async function handleLike() {
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

  async function handleShare() {
    const url = `${window.location.origin}/post/${postId}`;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // Kullanıcı paylaşımı iptal ettiyse sessizce geç.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      // Pano erişimi yoksa sessizce geç.
    }
  }

  return (
    <div className="flex items-center gap-8 border-t border-neutral-200 pt-2.5 mt-3">
      <button
        type="button"
        onClick={handleLike}
        aria-label={liked ? "Beğenmekten vazgeç" : "Beğen"}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          liked ? "text-accent" : "text-gray-400 hover:text-accent"
        }`}
      >
        <Heart
          size={18}
          strokeWidth={1.5}
          className={popping ? "animate-pop" : ""}
          fill={liked ? "currentColor" : "none"}
        />
        {count > 0 && <span>{count}</span>}
      </button>

      <button
        type="button"
        onClick={() => router.push(`/post/${postId}`)}
        aria-label="Yorumlar"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent transition-colors"
      >
        <MessageCircle size={18} strokeWidth={1.5} />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      <button
        type="button"
        onClick={handleShare}
        aria-label="Paylaş"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-accent transition-colors"
      >
        {shared ? (
          <>
            <Check size={18} strokeWidth={1.5} className="text-accent" />
            <span className="text-accent text-xs">Kopyalandı</span>
          </>
        ) : (
          <Share2 size={18} strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
