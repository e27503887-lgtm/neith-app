"use client";

// /outfits akışına özel kombin kartı:
// - fotoğrafa çift dokunuş → beğeni + ortada beliren kalp (yalnızca beğenir,
//   geri almaz); tek dokunuş kısa gecikmeyle detaya gider
// - satılık parça varsa altta mini parça şeridi (en fazla 3 yuvarlak foto)
// - kullanıcı satırının yanında stil etiketi chip'i (dokununca filtreler)
// Ana sayfadaki paylaşılan OutfitCard'a dokunulmaz; bu kart akışa özel.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import BrandBadge from "./BrandBadge";
import OutfitCollage from "./OutfitCollage";
import { supabase } from "../utils/supabase";
import type { OutfitPiece } from "../outfits/page";

const DOUBLE_TAP_MS = 280;

export type FeedCardOutfit = {
  id: number | string;
  title: string;
  image_url: string;
  style_tag: string | null;
  username: string;
  avatar_url?: string | null;
  account_type?: string | null;
  pieces?: OutfitPiece[];
  // Kolaj için TÜM parçalar (satılık olsun olmasın) — `pieces` (satılık
  // şerit) ile karıştırılmaz, ayrı bir alan.
  collage_pieces?: OutfitPiece[];
};

export default function OutfitFeedCard({
  outfit,
  onStyleTagSelect,
}: {
  outfit: FeedCardOutfit;
  onStyleTagSelect?: (tag: string) => void;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const { count: totalCount } = await supabase
        .from("outfit_likes")
        .select("*", { count: "exact", head: true })
        .eq("outfit_id", outfit.id);

      let alreadyLiked = false;
      if (uid) {
        const { data: existing } = await supabase
          .from("outfit_likes")
          .select("id")
          .eq("outfit_id", outfit.id)
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
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, [outfit.id]);

  async function setLike(next: boolean) {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (busy || liked === next) return;

    setBusy(true);
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));

    const { error } = next
      ? await supabase.from("outfit_likes").insert([{ outfit_id: outfit.id, user_id: userId }])
      : await supabase
          .from("outfit_likes")
          .delete()
          .eq("outfit_id", outfit.id)
          .eq("user_id", userId);

    if (error) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
    setBusy(false);
  }

  // Tek dokunuş: kısa gecikmeyle detaya git. İkinci dokunuş gecikme içinde
  // gelirse navigasyon iptal, beğeni + kalp patlaması.
  function handleImageTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setBurstKey((k) => k + 1);
      void setLike(true);
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      router.push(`/outfit/${outfit.id}`);
    }, DOUBLE_TAP_MS);
  }

  const pieces = outfit.pieces ?? [];
  const shownPieces = pieces.slice(0, 3);
  // Kolaj yalnızca en az 2 gerçek parçası olan kombinlerde devreye girer;
  // aksi halde (0-1 parça) mevcut tekil kombin fotoğrafı kartı kullanılır.
  const collagePieces = outfit.collage_pieces ?? [];
  const showCollage = collagePieces.length >= 2;

  return (
    <article className="card-hover bg-surface border border-neutral-200 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${outfit.username}`} className="shrink-0">
          {outfit.avatar_url ? (
            <Image
              src={outfit.avatar_url}
              alt={outfit.username}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {outfit.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <Link
          href={`/profile/${outfit.username}`}
          className="flex min-w-0 items-center gap-1 text-xs uppercase tracking-wide font-medium hover:text-accent transition-colors"
        >
          <span className="truncate">@{outfit.username}</span>
          {outfit.account_type === "brand" && <BrandBadge />}
        </Link>
        {outfit.style_tag && (
          <button
            type="button"
            onClick={() => onStyleTagSelect?.(outfit.style_tag!)}
            className="ml-auto shrink-0 text-[10px] uppercase tracking-wide border border-neutral-300 text-gray-600 px-2 py-0.5 hover:border-accent hover:text-accent transition-colors"
          >
            {outfit.style_tag}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleImageTap}
        aria-label={`${outfit.title} — detaya git, çift dokunuşla beğen`}
        className={`relative block w-full overflow-hidden text-left ${
          showCollage ? "" : "aspect-[3/4]"
        }`}
      >
        <span className="absolute top-2 left-2 z-10 bg-paper/90 text-accent text-xs uppercase tracking-wide font-medium px-2 py-1">
          Kombin
        </span>
        {showCollage ? (
          <OutfitCollage pieces={collagePieces} seedKey={outfit.id} alt={outfit.title} />
        ) : (
          <Image
            src={outfit.image_url}
            alt={outfit.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out md:hover:scale-105"
          />
        )}
        {burstKey > 0 && (
          <span
            key={burstKey}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
            aria-hidden
          >
            <Heart size={72} strokeWidth={0} fill="#ffffff" className="animate-heart-burst drop-shadow-md" />
          </span>
        )}
      </button>

      <div className="px-3 pt-2">
        <h2 className="text-sm truncate">{outfit.title}</h2>
      </div>

      {shownPieces.length > 0 && (
        <Link
          href={`/outfit/${outfit.id}`}
          className="mx-3 mt-2 flex items-center gap-2 border-t border-neutral-200 pt-2 group"
        >
          <span className="flex -space-x-2">
            {shownPieces.map((piece) => (
              <span
                key={String(piece.id)}
                className="relative inline-block h-7 w-7 overflow-hidden rounded-full border-2 border-surface bg-neutral-100"
              >
                <Image src={piece.image_url} alt="" fill sizes="28px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="text-xs text-gray-600 group-hover:text-accent transition-colors">
            {pieces.length} parça satışta
          </span>
        </Link>
      )}

      <div className="p-3">
        <div className="flex items-center gap-3">
          <Link href={`/outfit/${outfit.id}`} className="btn-primary flex-1">
            Shop the Outfit
          </Link>
          <button
            type="button"
            onClick={() => setLike(!liked)}
            aria-label={liked ? "Beğeniyi geri al" : "Beğen"}
            className="shrink-0 flex items-center gap-1 text-sm text-gray-600 hover:text-accent transition-colors"
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              className={liked ? "text-accent" : "text-gray-500"}
              fill={liked ? "currentColor" : "none"}
            />
            <span>{count}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
