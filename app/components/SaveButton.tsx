"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

type Props =
  | { productId: number | string; outfitId?: undefined }
  | { productId?: undefined; outfitId: number | string };

export default function SaveButton({
  productId,
  outfitId,
  className,
}: Props & { className?: string }) {
  const targetColumn = productId != null ? "product_id" : "outfit_id";
  const targetId = (productId ?? outfitId) as number | string;

  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      let alreadySaved = false;
      if (uid) {
        const { data: existing } = await supabase
          .from("saves")
          .select("id")
          .eq(targetColumn, targetId)
          .eq("user_id", uid)
          .maybeSingle();
        alreadySaved = !!existing;
      }

      if (!active) return;
      setUserId(uid);
      setSaved(alreadySaved);
    }

    load();
    return () => {
      active = false;
    };
  }, [targetColumn, targetId]);

  async function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);
    setPopping(true);
    setTimeout(() => setPopping(false), 200);

    if (saved) {
      setSaved(false);

      const { error } = await supabase
        .from("saves")
        .delete()
        .eq(targetColumn, targetId)
        .eq("user_id", userId);

      if (error) {
        setSaved(true);
      }
    } else {
      setSaved(true);

      const { error } = await supabase
        .from("saves")
        .insert([{ [targetColumn]: targetId, user_id: userId }]);

      if (error) {
        setSaved(false);
      }
    }

    setBusy(false);
  }

  return (
    <button onClick={handleClick} className={`text-gray-600 transition-colors hover:text-accent ${className ?? ""}`}>
      <Bookmark
        size={20}
        strokeWidth={1.5}
        className={`${saved ? "text-accent" : "text-gray-400"} ${popping ? "animate-pop" : ""}`}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
