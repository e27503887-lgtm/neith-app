"use client";

// Göreceli seri liderlik tablosu — BİLİNÇLİ OLARAK küresel/"tüm kullanıcılar"
// bir sıralama yok. Yalnızca iki dar, kişisel bağlamlı görünüm: takip
// ettiklerin ve bu hafta düelloya yeni başlayanlar. Editoryal, sakin bir
// liste — oyunlaştırılmış grafik yok.

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";

type LeaderboardRow = {
  id: string;
  username: string;
  avatar_url: string | null;
  duel_streak: number;
};

type Tab = "following" | "new";

function RowList({ rows, user }: { rows: LeaderboardRow[]; user: User }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-4">Henüz kimse yok.</p>;
  }

  return (
    <ol className="divide-y divide-neutral-200">
      {rows.map((row, index) => {
        const isMe = row.id === user.id;
        return (
          <li
            key={row.id}
            className={`flex items-center gap-3 py-2.5 ${isMe ? "bg-paper px-2 -mx-2" : ""}`}
          >
            <span className="w-5 text-xs text-gray-400 shrink-0 text-right">{index + 1}</span>
            <Link href={`/profile/${row.username}`} className="shrink-0">
              {row.avatar_url ? (
                <Image
                  src={row.avatar_url}
                  alt={row.username}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600">
                  {row.username?.[0]?.toUpperCase()}
                </div>
              )}
            </Link>
            <Link
              href={`/profile/${row.username}`}
              className={`flex-1 min-w-0 truncate text-sm hover:text-accent transition-colors ${
                isMe ? "font-semibold text-ink" : "text-gray-700"
              }`}
            >
              {isMe ? "Sen" : `@${row.username}`}
            </Link>
            <span className="text-xs text-gray-500 shrink-0">🔥 {row.duel_streak}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function DuelLeaderboard({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("following");
  const [following, setFollowing] = useState<LeaderboardRow[] | null>(null);
  const [newDuelists, setNewDuelists] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const followingIds = [...new Set((followRows ?? []).map((r) => r.following_id)), user.id];

      const { data: followingProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, duel_streak")
        .in("id", followingIds);

      if (!active) return;
      setFollowing(
        (followingProfiles ?? [])
          .map((p) => ({ ...p, duel_streak: p.duel_streak ?? 0 }))
          .sort((a, b) => b.duel_streak - a.duel_streak)
      );

      // weekly_new_duelists: son 7 günde ilk düello oyunu veren
      // kullanıcılar (db/duel_streaks.sql'deki view).
      const { data: newRows } = await supabase
        .from("weekly_new_duelists")
        .select("user_id");

      const newIds = [...new Set((newRows ?? []).map((r) => r.user_id))];
      if (newIds.length === 0) {
        if (active) setNewDuelists([]);
        return;
      }

      const { data: newProfiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, duel_streak")
        .in("id", newIds);

      if (!active) return;
      setNewDuelists(
        (newProfiles ?? [])
          .map((p) => ({ ...p, duel_streak: p.duel_streak ?? 0 }))
          .sort((a, b) => b.duel_streak - a.duel_streak)
      );
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  const rows = tab === "following" ? following : newDuelists;

  return (
    <section className="border border-neutral-200 bg-surface p-5">
      <p className="section-label mb-4">Seri Yarışı</p>

      <div className="flex gap-5 border-b border-neutral-200 mb-3">
        {(
          [
            { value: "following", label: "Takip Ettiklerim Arasında" },
            { value: "new", label: "Bu Haftaya Yeni Başlayanlar" },
          ] as { value: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`pb-2.5 -mb-px border-b-2 text-xs uppercase tracking-wide font-medium transition-colors ${
              tab === t.value
                ? "border-accent text-ink"
                : "border-transparent text-gray-500 hover:text-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows === null ? (
        <p className="text-sm text-gray-500 py-4">Yükleniyor...</p>
      ) : (
        <RowList rows={rows} user={user} />
      )}
    </section>
  );
}
