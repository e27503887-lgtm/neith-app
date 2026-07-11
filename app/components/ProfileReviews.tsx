"use client";

// Profildeki satıcı güveni bölümü: ortalama puan + değerlendirme sayısı
// ("★ 4.8 · 12 değerlendirme") ve değerlendirme listesi. Hiç değerlendirme
// yoksa bölüm görünmez.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { supabase } from "../utils/supabase";

type Review = {
  rating: number;
  comment: string | null;
  created_at: string;
  reviewerName: string;
};

export default function ProfileReviews({ userId }: { userId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: rows } = await supabase
        .from("reviews")
        .select("rating, comment, created_at, reviewer_id")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      const reviewerIds = [...new Set((rows ?? []).map((r) => r.reviewer_id))];
      const { data: profiles } = reviewerIds.length
        ? await supabase.from("profiles").select("id, username").in("id", reviewerIds)
        : { data: [] as { id: string; username: string }[] };
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

      if (!active) return;
      setReviews(
        (rows ?? []).map((r) => ({
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          reviewerName: nameById.get(r.reviewer_id) ?? "Bilinmeyen kullanıcı",
        }))
      );
    }

    load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (!reviews || reviews.length === 0) return null;

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="border border-neutral-200 bg-surface p-6">
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <h2 className="section-label">Değerlendirmeler</h2>
        <p className="text-sm text-ink">
          <span className="text-accent">★</span>{" "}
          <span className="font-semibold">
            {average.toLocaleString("tr-TR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </span>{" "}
          <span className="text-gray-500">· {reviews.length} değerlendirme</span>
        </p>
      </div>

      <ul className="divide-y divide-neutral-200">
        {reviews.map((review, index) => (
          <li key={index} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/profile/${review.reviewerName}`}
                className="text-xs uppercase tracking-wide text-gray-600 hover:text-accent transition-colors"
              >
                @{review.reviewerName}
              </Link>
              <span className="flex items-center gap-0.5" aria-label={`${review.rating} yıldız`}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <Star
                    key={v}
                    size={12}
                    className={v <= review.rating ? "text-accent" : "text-neutral-300"}
                    fill={v <= review.rating ? "currentColor" : "none"}
                    strokeWidth={1.5}
                  />
                ))}
              </span>
            </div>
            {review.comment && (
              <p className="font-serif italic text-sm text-gray-600 mt-1.5">“{review.comment}”</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
