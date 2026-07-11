"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function StartChatButton({ otherUserId }: { otherUserId: string | null }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [allowDms, setAllowDms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!otherUserId) {
        if (active) setChecked(true);
        return;
      }

      const [{ data: userData }, { data: targetProfile }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("profiles").select("allow_dms").eq("id", otherUserId).maybeSingle(),
      ]);

      if (!active) return;
      setCurrentUserId(userData.user?.id ?? null);
      setAllowDms(targetProfile?.allow_dms ?? true);
      setChecked(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [otherUserId]);

  if (!checked || !otherUserId || currentUserId === otherUserId) {
    return null;
  }

  if (!allowDms) {
    return (
      <button
        disabled
        className="border border-neutral-300 text-gray-500 text-xs uppercase tracking-wide px-4 py-1.5 cursor-not-allowed"
      >
        Mesajlara Kapalı
      </button>
    );
  }

  async function handleClick() {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    if (loading) return;

    setLoading(true);
    setError("");

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`
      )
      .maybeSingle();

    let conversationId = existing?.id;

    if (!conversationId) {
      const { data: created, error: insertError } = await supabase
        .from("conversations")
        .insert([{ user1_id: currentUserId, user2_id: otherUserId }])
        .select("id")
        .single();

      if (insertError || !created) {
        setLoading(false);
        setError("Bu kullanıcı yeni mesajlara kapalı.");
        return;
      }

      conversationId = created.id;
    }

    router.push(`/messages/${conversationId}`);
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300 disabled:opacity-50"
      >
        {loading ? "Açılıyor..." : "Mesaj At"}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
