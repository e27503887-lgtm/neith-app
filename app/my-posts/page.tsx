"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import { enrichPostsWithMedia, type EnrichedPost } from "@/lib/posts";
import { openComposePost, POST_CREATED_EVENT } from "../components/ComposePostModal";
import PostCard from "../components/PostCard";
import PostCardSkeleton from "../components/PostCardSkeleton";

type Profile = {
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

export default function MyPostsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      const [{ data: profileRow }, { data: rows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, avatar_url, account_type")
          .eq("id", data.user.id)
          .maybeSingle(),
        supabase
          .from("posts")
          .select("*")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false }),
      ]);

      const enriched = await enrichPostsWithMedia(rows ?? []);

      if (!active) return;
      setProfile(profileRow ?? null);
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

  const totalLikes = posts.reduce((sum, p) => sum + p.like_count, 0);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16">
      <div className="max-w-xl mx-auto">
        <div className="flex items-end justify-between gap-4 border-b border-neutral-200 px-4 pb-6 mb-2">
          <div>
            <p className="section-label">Gönderilerim</p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Paylaşım Arşivin</h1>
            {!loading && (
              <p className="mt-2 text-sm text-gray-500">
                {posts.length} gönderi · toplam {totalLikes} beğeni
              </p>
            )}
          </div>
          <button type="button" onClick={openComposePost} className="btn-primary shrink-0">
            Gönderi Paylaş
          </button>
        </div>

        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20 gap-4 px-4">
            <p className="text-gray-500">Henüz gönderi paylaşmadın.</p>
            <button type="button" onClick={openComposePost} className="btn-primary">
              İlk Gönderini Paylaş
            </button>
          </div>
        ) : (
          <div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={{
                  ...post,
                  username: profile?.username ?? "",
                  avatar_url: profile?.avatar_url ?? null,
                  account_type: profile?.account_type ?? null,
                }}
                onDeleted={() => setPosts((prev) => prev.filter((p) => p.id !== post.id))}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
