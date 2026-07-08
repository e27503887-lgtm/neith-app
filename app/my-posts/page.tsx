"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Heart, Images, Trash2 } from "lucide-react";
import { supabase } from "../utils/supabase";
import { enrichPostsWithMedia, type EnrichedPost } from "@/lib/posts";
import { openComposePost, POST_CREATED_EVENT } from "../components/ComposePostModal";

export default function MyPostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: rows } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      const enriched = await enrichPostsWithMedia(rows ?? []);

      if (!active) return;
      setPosts(enriched);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [router, reloadKey]);

  // Modal üzerinden yeni gönderi paylaşılırsa listeyi tazele.
  useEffect(() => {
    function handleCreated() {
      setReloadKey((k) => k + 1);
    }

    window.addEventListener(POST_CREATED_EVENT, handleCreated);
    return () => window.removeEventListener(POST_CREATED_EVENT, handleCreated);
  }, []);

  async function handleDelete(postId: number | string) {
    const confirmed = window.confirm("Bu gönderiyi silmek istediğine emin misin?");
    if (!confirmed) return;

    setDeletingId(postId);

    const { data: mediaRows } = await supabase
      .from("post_media")
      .select("id")
      .eq("post_id", postId);

    const mediaIds = (mediaRows ?? []).map((m) => m.id);
    if (mediaIds.length > 0) {
      await supabase.from("photo_tags").delete().in("post_media_id", mediaIds);
    }

    await supabase.from("post_media").delete().eq("post_id", postId);
    await supabase.from("post_likes").delete().eq("post_id", postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    setDeletingId(null);

    if (!error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  const totalLikes = posts.reduce((sum, p) => sum + p.like_count, 0);

  if (loading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 pb-6 mb-8">
          <div>
            <p className="section-label">Gönderilerim</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Paylaşım Arşivin</h1>
            <p className="mt-2 text-sm text-gray-500">
              {posts.length} gönderi · toplam {totalLikes} beğeni
            </p>
          </div>
          <button type="button" onClick={openComposePost} className="btn-primary shrink-0">
            Gönderi Paylaş
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 gap-4">
            <p className="text-gray-500">Henüz gönderi paylaşmadın.</p>
            <button type="button" onClick={openComposePost} className="btn-primary">
              İlk Gönderini Paylaş
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-200 border border-neutral-200 bg-white">
            {posts.map((post) => (
              <div key={post.id} className="flex gap-4 p-4">
                {post.cover_url && (
                  <Link
                    href={`/post/${post.id}`}
                    className="relative block h-20 w-20 shrink-0 overflow-hidden bg-neutral-50"
                  >
                    {post.cover_type === "video" ? (
                      <video src={post.cover_url} className="w-full h-full object-cover" muted />
                    ) : (
                      <Image
                        src={post.cover_url}
                        alt={post.caption ?? "Gönderi"}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                    {post.media_count > 1 && (
                      <span className="absolute top-1 right-1 text-paper">
                        <Images size={12} strokeWidth={1.5} />
                      </span>
                    )}
                  </Link>
                )}

                <div className="flex-1 min-w-0">
                  <Link href={`/post/${post.id}`} className="block hover:text-accent transition-colors">
                    <p className="text-sm text-ink whitespace-pre-wrap line-clamp-3">
                      {post.caption ?? <span className="text-gray-400 italic">Metinsiz gönderi</span>}
                    </p>
                  </Link>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      {new Date(post.created_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart size={12} strokeWidth={1.5} />
                      {post.like_count}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  aria-label="Gönderiyi sil"
                  className="self-start text-gray-400 hover:text-accent transition-colors disabled:opacity-40"
                >
                  <Trash2 size={17} strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
