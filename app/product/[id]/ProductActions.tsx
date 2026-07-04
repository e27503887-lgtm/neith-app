"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function ProductActions({
  productId,
  ownerId,
}: {
  productId: number | string;
  ownerId: string | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [offerMessage, setOfferMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(!!ownerId && data.user?.id === ownerId);
      setChecked(true);
    });
  }, [ownerId]);

  async function handleDelete() {
    const confirmed = window.confirm("Bu ilanı silmek istediğinize emin misiniz?");
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      setDeleting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!checked) {
    return null;
  }

  if (isOwner) {
    return (
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {deleting ? "Siliniyor..." : "İlanı Sil"}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOfferMessage("Teklif özelliği çok yakında!")}
        className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800"
      >
        Teklif Ver
      </button>
      {offerMessage && (
        <p className="text-gray-500 text-sm mt-2">{offerMessage}</p>
      )}
    </div>
  );
}
