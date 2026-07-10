"use client";

// Satıcının değerlendirme ortalamasını küçük gösterir: "★ 4.8".
// Değerlendirmesi olmayan satıcılarda hiç render edilmez.

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export default function SellerRating({
  sellerId,
  className = "",
}: {
  sellerId: string;
  className?: string;
}) {
  const [average, setAverage] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", sellerId);

      if (!active || !data || data.length === 0) return;
      const sum = data.reduce((total, row) => total + (row.rating ?? 0), 0);
      setAverage(sum / data.length);
    }

    load();
    return () => {
      active = false;
    };
  }, [sellerId]);

  if (average === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] text-gray-500 ${className}`}
      title="Satıcı değerlendirme ortalaması"
    >
      <span className="text-accent">★</span>
      {average.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
    </span>
  );
}
