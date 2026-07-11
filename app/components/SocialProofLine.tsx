"use client";

// Gerçek sosyal kanıt: parça kaç kombinde (outfit_items + kombin fotoğraf
// etiketleri) ve kaç gönderide (post fotoğraf etiketleri) kullanılmış,
// gerçek sayımla gösterir. Hiç kullanılmamışsa satır hiç görünmez.
// Satıra tıklayınca ilgili kombin/gönderi bağlantıları açılır.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { supabase } from "../utils/supabase";

type ProofData = {
  outfits: { id: number | string; title: string | null }[];
  postIds: (number | string)[];
};

export default function SocialProofLine({ productId }: { productId: number | string }) {
  const [proof, setProof] = useState<ProofData | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: items }, { data: tags }] = await Promise.all([
        supabase.from("outfit_items").select("outfit_id").eq("product_id", productId),
        supabase
          .from("photo_tags")
          .select("outfit_media_id, post_media_id")
          .eq("product_id", productId),
      ]);

      const outfitIds = new Set<number | string>(
        (items ?? []).map((i) => i.outfit_id).filter((v) => v !== null)
      );

      // Fotoğraf etiketleri medya üzerinden bağlanır; kombin/gönderi
      // kimliğine çevrilmeleri gerekir.
      const outfitMediaIds = (tags ?? [])
        .map((t) => t.outfit_media_id)
        .filter((v): v is number | string => v !== null);
      const postMediaIds = (tags ?? [])
        .map((t) => t.post_media_id)
        .filter((v): v is number | string => v !== null);

      const [{ data: outfitMedia }, { data: postMedia }] = await Promise.all([
        outfitMediaIds.length
          ? supabase.from("outfit_media").select("id, outfit_id").in("id", outfitMediaIds)
          : Promise.resolve({ data: [] as { id: number | string; outfit_id: number | string }[] }),
        postMediaIds.length
          ? supabase.from("post_media").select("id, post_id").in("id", postMediaIds)
          : Promise.resolve({ data: [] as { id: number | string; post_id: number | string }[] }),
      ]);

      (outfitMedia ?? []).forEach((m) => outfitIds.add(m.outfit_id));
      const postIds = [...new Set((postMedia ?? []).map((m) => m.post_id))];

      const outfitIdList = [...outfitIds];
      const { data: outfits } = outfitIdList.length
        ? await supabase.from("outfits").select("id, title").in("id", outfitIdList)
        : { data: [] as { id: number | string; title: string | null }[] };

      if (!active) return;
      setProof({ outfits: outfits ?? [], postIds });
    }

    load();
    return () => {
      active = false;
    };
  }, [productId]);

  if (!proof) return null;
  const outfitCount = proof.outfits.length;
  const postCount = proof.postIds.length;
  if (outfitCount + postCount === 0) return null;

  const parts: string[] = [];
  if (outfitCount > 0) parts.push(`${outfitCount} kombinde`);
  if (postCount > 0) parts.push(`${postCount} gönderide`);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-accent transition-colors"
      >
        <span aria-hidden>✦</span>
        Bu parça {parts.join(" ve ")} kullanıldı
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1 border-l border-neutral-200 pl-3">
          {proof.outfits.map((o) => (
            <li key={`o-${o.id}`}>
              <Link
                href={`/outfit/${o.id}`}
                className="text-xs text-gray-600 underline underline-offset-2 decoration-neutral-300 hover:text-accent transition-colors"
              >
                {o.title?.trim() || "Kombin"}
              </Link>
            </li>
          ))}
          {proof.postIds.map((id, index) => (
            <li key={`p-${id}`}>
              <Link
                href={`/post/${id}`}
                className="text-xs text-gray-600 underline underline-offset-2 decoration-neutral-300 hover:text-accent transition-colors"
              >
                Gönderi {index + 1}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
