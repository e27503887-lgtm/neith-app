"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { supabase } from "../utils/supabase";

// Hızlı görünüm modalı ilk tıklamada yüklenir (bundle'ı şişirmesin).
const PostQuickViewModal = dynamic(() => import("./PostQuickViewModal"), { ssr: false });

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
  const [quickViewOpen, setQuickViewOpen] = useState(false);

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

  return (
    <div className="mt-2 flex items-center gap-8">
      <button
        type="button"
        onClick={() => router.push(`/post/${postId}`)}
        aria-label="Yorumlar"
        className="flex min-h-11 items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors"
      >
        <MessageCircle size={18} strokeWidth={1.5} />
        {commentCount > 0 && <span>{commentCount}</span>}
      </button>

      <button
        type="button"
        onClick={handleLike}
        aria-label={liked ? "Beğenmekten vazgeç" : "Beğen"}
        className={`flex min-h-11 items-center gap-1.5 text-sm transition-colors ${
          liked ? "text-accent" : "text-gray-500 hover:text-accent"
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
        onClick={() => setQuickViewOpen(true)}
        aria-label="Hızlı görünüm ve paylaş"
        className="flex min-h-11 items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors"
      >
        <Share2 size={18} strokeWidth={1.5} />
      </button>

      {quickViewOpen && (
        <PostQuickViewModal postId={postId} onClose={() => setQuickViewOpen(false)} />
      )}
    </div>
  );
}
