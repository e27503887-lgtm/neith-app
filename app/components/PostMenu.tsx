"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { supabase } from "../utils/supabase";

// Sağ üstteki "..." menüsü. Şimdilik yalnızca gönderi sahibine "Sil" sunar;
// sahibi değilse hiç görünmez.
export default function PostMenu({
  postId,
  ownerId,
  onDeleted,
  redirectAfterDelete,
}: {
  postId: number | string;
  ownerId: string;
  onDeleted?: () => void;
  redirectAfterDelete?: string;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsOwner(data.user?.id === ownerId);
    });
    return () => {
      active = false;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleDelete() {
    const confirmed = window.confirm("Bu gönderiyi silmek istediğine emin misin?");
    if (!confirmed) return;

    setDeleting(true);

    const { data: mediaRows } = await supabase
      .from("post_media")
      .select("id")
      .eq("post_id", postId);

    const mediaIds = (mediaRows ?? []).map((m) => m.id);
    if (mediaIds.length > 0) {
      await supabase.from("photo_tags").delete().in("post_media_id", mediaIds);
    }

    await supabase.from("post_media").delete().eq("post_id", postId);
    await supabase.from("post_likes").delete().eq("post_id", postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    setDeleting(false);
    setOpen(false);

    if (error) return;

    onDeleted?.();
    if (redirectAfterDelete) {
      router.push(redirectAfterDelete);
      router.refresh();
    }
  }

  if (!isOwner) return null;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label="Gönderi seçenekleri"
        aria-expanded={open}
        className="p-1 -m-1 text-gray-400 hover:text-ink transition-colors"
      >
        <MoreHorizontal size={18} strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-36 bg-paper border border-neutral-200 rounded-lg shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-accent hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={15} strokeWidth={1.5} />
            {deleting ? "Siliniyor..." : "Sil"}
          </button>
        </div>
      )}
    </div>
  );
}
