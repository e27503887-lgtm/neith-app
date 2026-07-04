"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function OutfitActions({
  outfitId,
  ownerId,
}: {
  outfitId: number | string;
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
    const confirmed = window.confirm("Bu kombini silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    setDeleting(true);

    await supabase.from("outfit_items").delete().eq("outfit_id", outfitId);
    const { error } = await supabase.from("outfits").delete().eq("id", outfitId);

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
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50"
    >
      {deleting ? "Siliniyor..." : "Kombini Sil"}
    </button>
  );
}
