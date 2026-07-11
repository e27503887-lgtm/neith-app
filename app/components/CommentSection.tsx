"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Flag } from "lucide-react";
import ReportDialog from "./ReportDialog";
import { supabase } from "../utils/supabase";
import BrandBadge from "./BrandBadge";
import { excludeBlocked } from "@/lib/feed-mixer";
import { getBlockedUserIds } from "../utils/blocks";

const MAX_LENGTH = 500;

type Comment = {
  id: number | string;
  content: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

type Props =
  | { productId: number | string; outfitId?: undefined }
  | { productId?: undefined; outfitId: number | string };

export default function CommentSection({ productId, outfitId }: Props) {
  const targetColumn = productId != null ? "product_id" : "outfit_id";
  const targetId = (productId ?? outfitId) as number | string;

  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<number | string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      const [{ data: rowsRaw }, blockedIds] = await Promise.all([
        supabase
          .from("comments")
          .select("*")
          .eq(targetColumn, targetId)
          .order("created_at", { ascending: false }),
        getBlockedUserIds(),
      ]);

      // Engellenen kullanıcıların yorumları gösterilmez.
      const rows = excludeBlocked(rowsRaw ?? [], blockedIds, (r) => r.user_id);

      const userIds = [...new Set((rows ?? []).map((r) => r.user_id))];
      if (uid && !userIds.includes(uid)) {
        userIds.push(uid);
      }

      const { data: profiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, account_type")
            .in("id", userIds)
        : { data: [] as Profile[] };

      if (!active) return;

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

      setUserId(uid);
      setMyProfile(uid ? profileById.get(uid) ?? null : null);
      setComments(
        (rows ?? []).map((r) => ({
          ...r,
          username: profileById.get(r.user_id)?.username ?? "Bilinmeyen kullanıcı",
          avatar_url: profileById.get(r.user_id)?.avatar_url ?? null,
          account_type: profileById.get(r.user_id)?.account_type ?? null,
        }))
      );
      setLoaded(true);
    }

    load();
    return () => {
      active = false;
    };
  }, [targetColumn, targetId]);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!userId || !content || submitting) return;

    setSubmitting(true);

    const { data: inserted, error } = await supabase
      .from("comments")
      .insert([{ [targetColumn]: targetId, user_id: userId, content }])
      .select("*")
      .single();

    setSubmitting(false);

    if (error || !inserted) return;

    setComments((prev) => [
      {
        ...inserted,
        username: myProfile?.username ?? "Sen",
        avatar_url: myProfile?.avatar_url ?? null,
        account_type: myProfile?.account_type ?? null,
      },
      ...prev,
    ]);
    setDraft("");
  }

  async function handleDelete(commentId: number | string) {
    const confirmed = window.confirm("Bu yorumu silmek istediğine emin misin?");
    if (!confirmed) return;

    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  }

  if (!loaded) {
    return null;
  }

  return (
    <div>
      <h3 className="section-label mb-4">
        Yorumlar ({comments.length})
      </h3>

      {comments.length === 0 ? (
        <p className="text-gray-500 text-sm mb-4">İlk yorumu sen yaz!</p>
      ) : (
        <div className="flex flex-col gap-4 mb-6">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <Link href={`/profile/${c.username}`} className="shrink-0">
                {c.avatar_url ? (
                  <Image
                    src={c.avatar_url}
                    alt={c.username}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {c.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${c.username}`}
                    className="flex items-center gap-1 text-sm font-medium hover:text-accent transition-colors"
                  >
                    @{c.username}
                    {c.account_type === "brand" && <BrandBadge />}
                  </Link>
                  <span className="text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <p className="text-sm text-gray-700 break-words">{c.content}</p>
              </div>

              {c.user_id === userId ? (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-500 hover:text-accent shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setReportCommentId(c.id)}
                  aria-label="Yorumu şikayet et"
                  title="Şikayet Et"
                  className="text-gray-500 hover:text-accent shrink-0"
                >
                  <Flag size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {reportCommentId !== null && (
        <ReportDialog
          targetType="comment"
          targetId={reportCommentId}
          open
          onClose={() => setReportCommentId(null)}
        />
      )}

      {userId ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Yorum yaz..."
            maxLength={MAX_LENGTH}
            className="flex-1 min-w-0 border rounded-full px-4 py-2 text-sm focus:outline-none"
          />
          <button
            disabled={submitting || !draft.trim()}
            className="shrink-0 whitespace-nowrap bg-ink text-paper px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            Gönder
          </button>
        </form>
      ) : (
        <Link href="/login" className="text-sm text-gray-500 hover:text-accent transition-colors">
          Yorum yapmak için giriş yap
        </Link>
      )}
    </div>
  );
}
