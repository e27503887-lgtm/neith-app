"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import CommentSection from "./CommentSection";

type Post = {
  id: string;
  username: string;
  image_url: string;
  caption?: string;
  likes: number;
};

const postsMock: Post[] = [
  {
    id: "p1",
    username: "ayse",
    image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&q=80&auto=format&fit=crop",
    caption: "Yaz akşamları için hafif katmanlar.",
    likes: 24,
  },
  {
    id: "p2",
    username: "mehmet",
    image_url: "https://images.unsplash.com/photo-1520975911998-5ae3a1c1b9a1?w=1200&q=80&auto=format&fit=crop",
    caption: "Vintage dokunuşlarla modern uyum.",
    likes: 12,
  },
  {
    id: "p3",
    username: "elife",
    image_url: "https://images.unsplash.com/photo-1488722796624-0aa6f1bb6399?w=1200&q=80&auto=format&fit=crop",
    caption: "Soft tones and layered textures.",
    likes: 48,
  },
];

export default function SocialFeed() {
  const [posts] = useState<Post[]>(postsMock);
  const [likes, setLikes] = useState<Record<string, number>>(
    Object.fromEntries(postsMock.map((p) => [p.id, p.likes]))
  );
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [animating, setAnimating] = useState<Record<string, boolean>>({});

  function toggleLike(id: string) {
    setLiked((l) => ({ ...l, [id]: !l[id] }));
    setLikes((s) => ({ ...s, [id]: s[id] + (liked[id] ? -1 : 1) }));
    setAnimating((a) => ({ ...a, [id]: true }));
    window.setTimeout(() => setAnimating((a) => ({ ...a, [id]: false })), 220);
  }

  return (
    <div>
      <div className="flex flex-col gap-6">
        {posts.map((p) => (
          <article key={p.id} className="bg-white border border-neutral-200 rounded overflow-hidden">
            <div className="relative w-full h-[520px] bg-gray-50">
              <Image src={p.image_url} alt={p.caption ?? "Outfit görseli"} fill className="object-cover" />
              <div className="absolute right-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-black shadow-sm">
                Yorum Paneli
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-center justify-between mb-4 gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-black text-white px-3 py-1 text-[11px] uppercase tracking-[0.24em]">
                  <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  Canlı Akış
                </span>
                <span className="text-xs text-gray-500">Yeni yorumlar canlı</span>
              </div>

              <div className="flex items-center justify-center mb-3 gap-6">
                <button
                  onClick={() => toggleLike(p.id)}
                  className={`flex items-center gap-2 text-sm text-black transition-transform duration-200 ${animating[p.id] ? "scale-110" : "scale-100"}`}
                >
                  <Heart
                    size={20}
                    className={`transition-transform duration-200 ${liked[p.id] ? "text-accent scale-110" : "text-black"}`}
                  />
                  <span className="text-sm">{likes[p.id]}</span>
                </button>

                <button className="flex items-center gap-2 text-sm text-black">
                  <MessageCircle size={20} />
                </button>

                <button className="flex items-center gap-2 text-sm text-black">
                  <Share2 size={20} />
                </button>
              </div>

              <p className="text-sm text-gray-700 mb-3 text-center">{p.caption}</p>

              <div className="text-center mb-6">
                <a href={`/outfit/${p.id}`} className="btn-primary inline-block">Shop the Outfit</a>
              </div>

              <div className="border-t border-neutral-200 pt-4">
                <CommentSection productId={p.id} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
