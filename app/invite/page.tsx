"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check, Copy, Share2, Users } from "lucide-react";
import { supabase } from "../utils/supabase";

const INVITE_BASE_URL = "https://neithapp.com.tr/join";

type InvitedUser = { username: string; avatar_url: string | null };

export default function InvitePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("invite_code")
        .eq("id", data.user.id)
        .maybeSingle();

      setInviteCode(profile?.invite_code ?? null);

      const { data: inviteRows } = await supabase
        .from("invites")
        .select("invited_id")
        .eq("inviter_id", data.user.id);

      const invitedIds = (inviteRows ?? []).map((r) => r.invited_id);

      if (invitedIds.length > 0) {
        const { data: invitedProfiles } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .in("id", invitedIds);
        setInvitedUsers(invitedProfiles ?? []);
      }

      setChecking(false);
    });
  }, [router]);

  const inviteUrl = inviteCode ? `${INVITE_BASE_URL}/${inviteCode}` : "";

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleShare() {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Neith'e Katıl",
          text: "Neith'e katıl, gardırobunu keşfet.",
          url: inviteUrl,
        });
      } catch {
        // kullanıcı paylaşım panelini kapattı
      }
    } else {
      handleCopy();
    }
  }

  if (checking) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-lg mx-auto text-center">
        <p className="section-label inline-flex">Arkadaşını Davet Et</p>
        <h1 className="mt-3 font-serif text-3xl text-ink tracking-tight">
          Neith&apos;i sevdiklerinle paylaş
        </h1>
        <p className="mt-3 text-sm text-gray-600 font-serif italic">
          Davet ettiğin her arkadaşınla ikiniz de Davetçi rozetini kazanın.
        </p>

        <div className="border border-neutral-200 p-6 mt-8 text-left">
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Davet Linkin</p>
          <p className="font-medium text-sm text-ink break-all">{inviteUrl}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              type="button"
              onClick={handleCopy}
              className="btn-primary flex-1 gap-2"
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={1.5} /> Kopyalandı ✓
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={1.5} /> Linki Kopyala
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center gap-2 border border-neutral-300 text-ink text-xs uppercase tracking-widest font-medium px-6 py-3 transition-colors hover:border-ink"
            >
              <Share2 size={14} strokeWidth={1.5} /> Paylaş
            </button>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-ink">{invitedUsers.length}</span> kişi senin davetinle katıldı
          </p>

          {invitedUsers.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-4 mt-5">
              {invitedUsers.map((u) => (
                <Link
                  key={u.username}
                  href={`/profile/${u.username}`}
                  className="flex flex-col items-center gap-1.5 w-16"
                >
                  {u.avatar_url ? (
                    <Image
                      src={u.avatar_url}
                      alt={u.username}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] text-gray-500 truncate w-full text-center">
                    @{u.username}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 mt-6 text-gray-500">
              <Users size={24} strokeWidth={1} />
              <p className="text-sm">Henüz kimseyi davet etmedin.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
