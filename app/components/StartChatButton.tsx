"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function StartChatButton({ otherUserId }: { otherUserId: string | null }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
      setChecked(true);
    });
  }, []);

  if (!checked || !otherUserId) {
    return null;
  }

  if (currentUserId === otherUserId) {
    return null;
  }

  async function handleClick() {
    if (!currentUserId) {
      router.push("/login");
      return;
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`
      )
      .maybeSingle();

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: created, error } = await supabase
        .from("conversations")
        .insert([{ user1_id: currentUserId, user2_id: otherUserId }])
        .select("id")
        .single();

      if (error || !created) {
        setLoading(false);
        return;
      }

      conversationId = created.id;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="border px-4 py-1.5 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "Açılıyor..." : "Mesaj At"}
    </button>
  );
}
