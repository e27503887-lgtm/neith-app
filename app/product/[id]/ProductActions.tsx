"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";

export default function ProductActions({
  productId,
  ownerId,
  sellerType,
  isSold = false,
}: {
  productId: number | string;
  ownerId: string | null;
  sellerType?: string | null;
  isSold?: boolean;
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
      <button onClick={handleDelete} disabled={deleting} className="btn-primary w-full">
        {deleting ? "Siliniyor..." : "İlanı Sil"}
      </button>
    );
  }

  if (sellerType === "brand") {
    return null;
  }

  // Satılan ürüne teklif verilemez.
  if (isSold) {
    return (
      <p className="text-xs uppercase tracking-wide text-gray-500 border border-neutral-200 px-4 py-3 text-center">
        Bu ürün satıldı — teklif kapalı
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOfferMessage("Teklif özelliği çok yakında!")}
        className="btn-primary w-full"
      >
        Teklif Ver
      </button>
      {offerMessage && (
        <p className="text-gray-500 text-sm mt-2">{offerMessage}</p>
      )}
    </div>
  );
}
