"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function PostActions({
  postId,
  ownerId,
}: {
  postId: number | string;
  ownerId: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === ownerId);
      setChecked(true);
    });
  }, [ownerId]);

  async function handleDelete() {
    const confirmed = window.confirm("Bu gönderiyi silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    setDeleting(true);

    await supabase.from("post_media").delete().eq("post_id", postId);
    await supabase.from("post_likes").delete().eq("post_id", postId);
    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      setDeleting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!checked || !isOwner) {
    return null;
  }

  return (
    <button onClick={handleDelete} disabled={deleting} className="btn-primary w-full">
      {deleting ? "Siliniyor..." : "Gönderiyi Sil"}
    </button>
  );
}
