"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { supabase } from "../utils/supabase";

type Person = {
  username: string;
  avatar_url: string | null;
};

export default function FollowStats({
  userId,
  followerCount,
  followingCount,
  variant = "compact",
}: {
  userId: string;
  followerCount: number;
  followingCount: number;
  variant?: "compact" | "stat";
}) {
  const [modal, setModal] = useState<"followers" | "following" | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  async function openModal(type: "followers" | "following") {
    setModal(type);
    setLoading(true);

    let ids: string[] = [];

    if (type === "followers") {
      const { data: rows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", userId);
      ids = (rows ?? []).map((r) => r.follower_id);
    } else {
      const { data: rows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
      ids = (rows ?? []).map((r) => r.following_id);
    }

    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("username, avatar_url").in("id", ids)
      : { data: [] as Person[] };

    setPeople(profiles ?? []);
    setLoading(false);
  }

  function closeModal() {
    setModal(null);
  }

  return (
    <>
      {variant === "stat" ? (
        <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-2 lg:grid-cols-2 lg:text-right">
          <button
            type="button"
            onClick={() => openModal("followers")}
            className="rounded-3xl bg-white/90 px-4 py-3 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <p className="text-3xl font-semibold text-ink">{followerCount}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Takipçi</p>
          </button>
          <button
            type="button"
            onClick={() => openModal("following")}
            className="rounded-3xl bg-white/90 px-4 py-3 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <p className="text-3xl font-semibold text-ink">{followingCount}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Takip</p>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
          <button type="button" onClick={() => openModal("followers")} className="hover:text-accent transition-colors">
            <span className="font-medium text-ink">{followerCount}</span> Takipçi
          </button>
          <span>·</span>
          <button type="button" onClick={() => openModal("following")} className="hover:text-accent transition-colors">
            <span className="font-medium text-ink">{followingCount}</span> Takip
          </button>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-paper rounded-xl max-w-sm w-full max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <h3 className="text-sm font-semibold">
                {modal === "followers" ? "Takipçiler" : "Takip Edilenler"}
              </h3>
              <button type="button" onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-neutral-200">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-8">Yükleniyor...</p>
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Kimse yok.</p>
              ) : (
                people.map((p) => (
                  <Link
                    key={p.username}
                    href={`/profile/${p.username}`}
                    onClick={closeModal}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50"
                  >
                    {p.avatar_url ? (
                      <Image
                        src={p.avatar_url}
                        alt={p.username}
                        width={36}
                        height={36}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {p.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">@{p.username}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
