"use client";

// Ayarlardaki "Engellenenler" listesi — kaldırma imkanıyla.
// Hiç engelleme yoksa bölüm görünmez.

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import { getBlockedUserIds, unblockUser } from "../utils/blocks";

type BlockedProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function BlockedUsersList() {
  const [blocked, setBlocked] = useState<BlockedProfile[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const ids = [...(await getBlockedUserIds())];
      if (ids.length === 0) {
        if (active) setBlocked([]);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);
      if (active) setBlocked(data ?? []);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function handleUnblock(id: string) {
    setBusyId(id);
    const error = await unblockUser(id);
    if (!error) {
      setBlocked((prev) => (prev ?? []).filter((p) => p.id !== id));
    }
    setBusyId(null);
  }

  if (!blocked || blocked.length === 0) return null;

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6">
      <p className="text-sm font-medium text-gray-700 mb-3">Engellenenler</p>
      <ul className="divide-y divide-neutral-200 border border-neutral-200">
        {blocked.map((profile) => (
          <li key={profile.id} className="flex items-center gap-3 p-3">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                {profile.username?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm text-ink flex-1 truncate">@{profile.username}</span>
            <button
              type="button"
              onClick={() => handleUnblock(profile.id)}
              disabled={busyId === profile.id}
              className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors disabled:opacity-50"
            >
              {busyId === profile.id ? "Kaldırılıyor..." : "Engeli Kaldır"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
