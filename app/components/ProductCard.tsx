"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import LikeButton from "./LikeButton";
import SaveButton from "./SaveButton";
import BrandBadge from "./BrandBadge";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  comment_count?: number;
  account_type?: string | null;
};

export default function ProductCard({ product }: { product: Product }) {
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function handleCartClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setShowToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setShowToast(false), 1400);
  }

  return (
    <article className="group overflow-hidden border border-neutral-200 bg-paper">
      <div className="relative">
        <Link href={`/product/${product.id}`} className="block">
          <div className="relative aspect-[4/5] overflow-hidden sm:aspect-[3/4]">
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>

          <div className="px-4 pb-4 pt-4">
            <h2 className="line-clamp-2 text-sm leading-5 text-ink">{product.title}</h2>
            <Link
              href={`/profile/${product.username}`}
              className="mt-2 flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-gray-500 transition-colors hover:text-accent"
            >
              <span>@{product.username}</span>
              {product.account_type === "brand" && <BrandBadge />}
            </Link>
          </div>
        </Link>

        <div className="absolute inset-x-0 top-0 flex items-start justify-end gap-2 p-3">
          <div onClick={(event) => event.stopPropagation()}>
            <LikeButton
              productId={product.id}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/80 p-0 text-ink shadow-sm backdrop-blur-sm hover:bg-white"
              showCount={false}
              iconSize={18}
            />
          </div>
          <div onClick={(event) => event.stopPropagation()}>
            <SaveButton
              productId={product.id}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/80 p-0 text-ink shadow-sm backdrop-blur-sm hover:bg-white"
            />
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-neutral-200 px-4 pb-4 pt-3">
          <p className="font-serif text-xl text-ink">{product.price.toLocaleString("tr-TR")} ₺</p>
          <button
            type="button"
            aria-label="Sepete ekle"
            onClick={handleCartClick}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-ink text-paper shadow-sm transition-colors hover:bg-[#4d1b1b]"
          >
            <ShoppingBag size={17} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {showToast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-paper/95 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-ink shadow-sm backdrop-blur">
          Yakında!
        </div>
      )}
    </article>
  );
}
