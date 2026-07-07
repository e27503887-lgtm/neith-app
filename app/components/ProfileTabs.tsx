"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Images } from "lucide-react";
import WardrobeGrid from "./WardrobeGrid";
import { supabase } from "../utils/supabase";

type ProductGridItem = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

type WardrobeOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  like_count: number;
  is_highlighted: boolean;
};

type PostGridItem = {
  id: number | string;
  cover_url: string;
  cover_type: "image" | "video";
  media_count: number;
  like_count: number;
};

const TABS = [
  { key: "products", label: "Ürünler" },
  { key: "outfits", label: "Kombinler" },
  { key: "posts", label: "Gönderiler" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ProfileTabs({
  profileId,
  products,
  outfits,
  posts,
}: {
  profileId: string;
  products: ProductGridItem[];
  outfits: WardrobeOutfit[];
  posts: PostGridItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("products");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === profileId);
    });
  }, [profileId]);

  return (
    <div>
      <div className="flex gap-6 border-b border-neutral-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 -mb-px border-b-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-accent text-ink"
                : "border-transparent text-gray-500 hover:text-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "products" &&
        (products.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-gray-500 text-sm">Henüz ürün paylaşılmamış.</p>
            {isOwner && (
              <Link href="/sell" className="btn-primary">
                İlan Ver
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.id}`}
                className="group relative aspect-square overflow-hidden bg-neutral-50"
              >
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <span className="text-paper text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {product.price.toLocaleString("tr-TR")} ₺
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ))}

      {activeTab === "outfits" && <WardrobeGrid profileId={profileId} outfits={outfits} />}

      {activeTab === "posts" &&
        (posts.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-gray-500 text-sm">Henüz gönderi paylaşılmamış.</p>
            {isOwner && (
              <Link href="/post/new" className="btn-primary">
                Gönderi Paylaş
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="group relative aspect-square overflow-hidden bg-neutral-50"
              >
                {post.cover_type === "video" ? (
                  <video src={post.cover_url} className="w-full h-full object-cover" muted />
                ) : (
                  <Image
                    src={post.cover_url}
                    alt="Gönderi"
                    fill
                    sizes="(min-width: 1024px) 20vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                )}
                {post.media_count > 1 && (
                  <span className="absolute top-1.5 right-1.5 z-10 text-paper">
                    <Images size={14} strokeWidth={1.5} />
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <span className="flex items-center gap-1.5 text-paper opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Heart size={16} fill="currentColor" />
                    <span className="text-sm font-medium">{post.like_count}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ))}
    </div>
  );
}
