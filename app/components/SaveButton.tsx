"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function SaveButton({ productId }: { productId: number | string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

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
          .eq("product_id", productId)
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
  }, [productId]);

  async function handleClick() {
    if (!userId) {
      router.push("/login");
      return;
    }
    if (busy) return;

    setBusy(true);

    if (saved) {
      setSaved(false);

      const { error } = await supabase
        .from("saves")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", userId);

      if (error) {
        setSaved(true);
      }
    } else {
      setSaved(true);

      const { error } = await supabase
        .from("saves")
        .insert([{ product_id: productId, user_id: userId }]);

      if (error) {
        setSaved(false);
      }
    }

    setBusy(false);
  }

  return (
    <button onClick={handleClick} className="text-gray-600 hover:text-accent transition-colors">
      <Bookmark
        size={20}
        strokeWidth={1.5}
        className={saved ? "text-accent" : "text-gray-400"}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
