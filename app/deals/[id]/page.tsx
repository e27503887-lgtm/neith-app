"use client";

// Anlaşma detayı: 3 adımlı durum göstergesi (Anlaşıldı → Kargoda →
// Tamamlandı), role göre aksiyonlar. Kritik butonlar yüklenme/hata
// durumunda kaybolmaz — disabled gösterilir. Her durum değişiminden sonra
// kayıt yeniden çekilir (stale state kalmaz).

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { supabase } from "../../utils/supabase";
import StartChatButton from "../../components/StartChatButton";
import {
  DEAL_STEPS,
  DEAL_STATUS_LABELS,
  SHIPPING_CARRIERS,
  dealStepIndex,
  type Deal,
  type DealStatus,
} from "@/lib/deals";

type ProductInfo = {
  id: number | string;
  title: string;
  image_url: string;
  is_sold: boolean | null;
};

export default function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [userId, setUserId] = useState<string | null>(null);
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [counterpart, setCounterpart] = useState<{ id: string; username: string } | null>(null);

  const [carrier, setCarrier] = useState<string>(SHIPPING_CARRIERS[0]);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [myReview, setMyReview] = useState<{ rating: number; comment: string | null } | null>(
    null
  );
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  const reload = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id ?? null;
    setUserId(uid);

    const { data: d } = await supabase.from("deals").select("*").eq("id", id).maybeSingle();
    if (!d) {
      setDeal(null);
      return;
    }
    setDeal(d as Deal);
    if (d.shipping_carrier) setCarrier(d.shipping_carrier);

    const counterpartId = uid === d.buyer_id ? d.seller_id : d.buyer_id;
    const [{ data: p }, { data: profile }, reviewRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, title, image_url, is_sold")
        .eq("id", d.product_id)
        .maybeSingle(),
      supabase.from("profiles").select("id, username").eq("id", counterpartId).maybeSingle(),
      uid
        ? supabase
            .from("reviews")
            .select("rating, comment")
            .eq("reviewer_id", uid)
            .eq("seller_id", counterpartId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setProduct((p as ProductInfo) ?? null);
    setCounterpart(profile ?? null);
    setMyReview(reviewRes.data ?? null);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (deal === undefined) {
    return <main className="min-h-screen bg-paper pt-24 px-6" />;
  }

  if (deal === null || !userId || (userId !== deal.buyer_id && userId !== deal.seller_id)) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Anlaşma bulunamadı.</p>
      </main>
    );
  }

  const isSeller = userId === deal.seller_id;
  const isBuyer = userId === deal.buyer_id;
  const stepIndex = dealStepIndex(deal.status);

  async function updateStatus(next: DealStatus, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase
      .from("deals")
      .update({ status: next, ...extra })
      .eq("id", deal!.id);

    if (updateError) {
      setError("Güncelleme başarısız: " + updateError.message);
    } else {
      await reload();
    }
    setBusy(false);
  }

  async function handleShip() {
    await updateStatus("shipped", {
      shipping_carrier: carrier,
      tracking_number: tracking.trim() || null,
    });
  }

  async function handleComplete() {
    const confirmed = window.confirm(
      "Ürünü teslim aldığını onaylıyor musun? Bu işlem anlaşmayı tamamlar."
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");

    const { error: updateError } = await supabase
      .from("deals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", deal!.id);

    if (updateError) {
      setError("Güncelleme başarısız: " + updateError.message);
      setBusy(false);
      return;
    }

    // Ürün satıldı olarak işaretlenir; akış/arama/vitrinlerden düşer.
    await supabase.from("products").update({ is_sold: true }).eq("id", deal!.product_id);
    await reload();
    setBusy(false);
  }

  async function handleCancel() {
    const confirmed = window.confirm(
      "Anlaşmayı iptal etmek istediğine emin misin? Ürün satışta kalır."
    );
    if (!confirmed) return;
    await updateStatus("cancelled");
  }

  async function handleReviewSubmit() {
    if (rating === 0 || !counterpart) return;
    setReviewBusy(true);
    setError("");

    const { error: insertError } = await supabase.from("reviews").insert([
      {
        reviewer_id: userId,
        seller_id: counterpart.id,
        rating,
        comment: comment.trim() || null,
      },
    ]);

    if (insertError && insertError.code !== "23505") {
      setError("Değerlendirme kaydedilemedi: " + insertError.message);
    } else {
      setMyReview({ rating, comment: comment.trim() || null });
    }
    setReviewBusy(false);
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="border-b border-neutral-200 pb-6">
          <p className="section-label mb-2">Anlaşma</p>
          <h1 className="font-serif text-3xl text-ink tracking-tight">
            {product?.title ?? "Ürün"}
          </h1>
        </div>

        {deal.status === "cancelled" ? (
          <div className="border border-neutral-300 bg-surface px-4 py-3">
            <p className="text-sm text-gray-600">
              Bu anlaşma iptal edildi. Ürün satışta kalmaya devam ediyor.
            </p>
          </div>
        ) : (
          // 3 adımlı durum göstergesi
          <ol className="flex items-center" aria-label="Anlaşma durumu">
            {DEAL_STEPS.map((step, index) => {
              const done = index < stepIndex;
              const current = index === stepIndex;
              return (
                <li key={step.status} className="flex items-center flex-1 last:flex-none">
                  <span className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-colors ${
                        done
                          ? "bg-primary border-primary text-paper"
                          : current
                            ? "border-accent text-accent"
                            : "border-neutral-300 text-gray-500"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wide whitespace-nowrap ${
                        current ? "text-accent" : done ? "text-ink" : "text-gray-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </span>
                  {index < DEAL_STEPS.length - 1 && (
                    <span
                      className={`mx-2 mb-5 h-px flex-1 ${done ? "bg-primary" : "bg-neutral-200"}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <div className="border border-neutral-200 bg-surface p-4 flex items-center gap-4">
          <Link
            href={`/product/${deal.product_id}`}
            className="relative h-24 w-20 shrink-0 overflow-hidden bg-neutral-100"
          >
            {product?.image_url && (
              <Image
                src={product.image_url}
                alt={product.title}
                fill
                sizes="80px"
                className="object-cover"
              />
            )}
          </Link>
          <div className="min-w-0 flex-1">
            {typeof deal.price === "number" && (
              <p className="font-semibold text-xl text-ink">
                {deal.price.toLocaleString("tr-TR")} ₺
              </p>
            )}
            <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">
              {isSeller ? "Alıcı" : "Satıcı"}:{" "}
              {counterpart ? (
                <Link
                  href={`/profile/${counterpart.username}`}
                  className="text-ink hover:text-accent transition-colors"
                >
                  @{counterpart.username}
                </Link>
              ) : (
                "—"
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(deal.created_at).toLocaleDateString("tr-TR")} tarihinde anlaşıldı
              {deal.completed_at
                ? ` · ${new Date(deal.completed_at).toLocaleDateString("tr-TR")} tarihinde tamamlandı`
                : ""}
            </p>
          </div>
          <div className="shrink-0">
            <StartChatButton otherUserId={counterpart?.id ?? null} />
          </div>
        </div>

        {(deal.status === "shipped" || deal.status === "completed") && deal.shipping_carrier && (
          <div className="border border-neutral-200 bg-surface p-4">
            <p className="section-label mb-2">Kargo Bilgisi</p>
            <p className="text-sm text-ink">
              {deal.shipping_carrier}
              {deal.tracking_number ? (
                <span className="text-gray-600"> · Takip no: {deal.tracking_number}</span>
              ) : null}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Satıcılar genellikle 3 iş günü içinde kargolar. Gecikme olursa mesajla iletişime
              geçebilirsin.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* SATICI · agreed: kargoya ver */}
        {isSeller && deal.status === "agreed" && (
          <div className="border border-neutral-200 bg-surface p-4 space-y-3">
            <p className="section-label">Kargoya Ver</p>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full p-3 border border-neutral-300 bg-surface text-sm text-ink"
            >
              {SHIPPING_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="Takip numarası (opsiyonel)"
              className="w-full p-3 border border-neutral-300 bg-surface text-sm"
            />
            <button onClick={handleShip} disabled={busy} className="btn-primary w-full">
              {busy ? "Kaydediliyor..." : "Kargoya Verdim"}
            </button>
          </div>
        )}

        {/* ALICI · shipped: teslim aldım */}
        {isBuyer && deal.status === "shipped" && (
          <button onClick={handleComplete} disabled={busy} className="btn-primary w-full">
            {busy ? "Kaydediliyor..." : "Teslim Aldım"}
          </button>
        )}

        {/* Her iki taraf · agreed: iptal */}
        {deal.status === "agreed" && (
          <button
            onClick={handleCancel}
            disabled={busy}
            className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors disabled:opacity-50 self-start"
          >
            {busy ? "İşleniyor..." : "İptal Et"}
          </button>
        )}

        {/* Tamamlandı: değerlendirme */}
        {deal.status === "completed" && (
          <div className="border border-neutral-200 bg-surface p-4">
            <p className="section-label mb-3">Değerlendir</p>
            {myReview ? (
              <div>
                <div className="flex items-center gap-1" aria-label={`${myReview.rating} yıldız`}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Star
                      key={v}
                      size={16}
                      className={v <= myReview.rating ? "text-accent" : "text-neutral-300"}
                      fill={v <= myReview.rating ? "currentColor" : "none"}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                {myReview.comment && (
                  <p className="font-serif italic text-sm text-gray-600 mt-2">
                    “{myReview.comment}”
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Değerlendirmen için teşekkürler.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setRating(v)}
                      aria-label={`${v} yıldız ver`}
                      className="p-0.5"
                    >
                      <Star
                        size={22}
                        className={v <= rating ? "text-accent" : "text-neutral-300 hover:text-gray-500"}
                        fill={v <= rating ? "currentColor" : "none"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 280))}
                  placeholder="Kısa bir yorum (opsiyonel)"
                  rows={2}
                  className="w-full p-3 border border-neutral-300 bg-surface text-sm resize-none"
                />
                <button
                  onClick={handleReviewSubmit}
                  disabled={reviewBusy || rating === 0}
                  className="btn-primary"
                >
                  {reviewBusy ? "Gönderiliyor..." : "Değerlendirmeyi Gönder"}
                </button>
              </div>
            )}
          </div>
        )}

        <p>
          <Link
            href="/deals"
            className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
          >
            ← Anlaşmalarıma Dön
          </Link>
        </p>
      </div>
    </main>
  );
}
