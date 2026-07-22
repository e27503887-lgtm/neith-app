"use client";

// "Anlaşmalarım" — Alışlarım / Satışlarım sekmeleri. Her kart: ürün
// fotoğrafı, karşı taraf, fiyat, durum rozeti. Detaya /deals/[id] gider.

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import EmptyState from "../components/EmptyState";
import {
  DEAL_STATUS_BADGE,
  DEAL_STATUS_LABELS,
  type Deal,
} from "@/lib/deals";

type DealRow = Deal & {
  product: { id: number | string; title: string; image_url: string } | null;
  counterpartName: string;
};

type Tab = "purchases" | "sales";

export default function DealsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("purchases");
  const [userId, setUserId] = useState<string | null>(null);
  const [deals, setDeals] = useState<DealRow[] | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!uid) {
        router.replace("/login");
        return;
      }

      const { data: dealRows } = await supabase
        .from("deals")
        .select("*")
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
        .order("created_at", { ascending: false });

      const rows = dealRows ?? [];
      const productIds = [...new Set(rows.map((d) => d.product_id))];
      const counterpartIds = [
        ...new Set(rows.map((d) => (d.buyer_id === uid ? d.seller_id : d.buyer_id))),
      ];

      const [{ data: products }, { data: profiles }] = await Promise.all([
        productIds.length
          ? supabase.from("products").select("id, title, image_url").in("id", productIds)
          : Promise.resolve({ data: [] as { id: number | string; title: string; image_url: string }[] }),
        counterpartIds.length
          ? supabase.from("profiles").select("id, username").in("id", counterpartIds)
          : Promise.resolve({ data: [] as { id: string; username: string }[] }),
      ]);

      const productById = new Map((products ?? []).map((p) => [String(p.id), p]));
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.username]));

      if (!active) return;
      setUserId(uid);
      setDeals(
        rows.map((d) => ({
          ...d,
          product: productById.get(String(d.product_id)) ?? null,
          counterpartName:
            nameById.get(d.buyer_id === uid ? d.seller_id : d.buyer_id) ?? "Bilinmeyen kullanıcı",
        }))
      );
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  const visible = (deals ?? []).filter((d) =>
    tab === "purchases" ? d.buyer_id === userId : d.seller_id === userId
  );

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 border-b border-neutral-200 pb-6">
          <p className="section-label mb-2">İkinci El</p>
          <h1 className="font-serif text-3xl text-ink tracking-tight">Anlaşmalarım</h1>
        </div>

        <div className="flex gap-6 border-b border-neutral-200 mb-6">
          {(
            [
              { value: "purchases", label: "Alışlarım" },
              { value: "sales", label: "Satışlarım" },
            ] as { value: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`pb-3 -mb-px border-b-2 text-sm font-medium transition-colors ${
                tab === t.value
                  ? "border-accent text-ink"
                  : "border-transparent text-gray-500 hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {deals === null ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : visible.length === 0 ? (
          <EmptyState
            illustration="frame"
            title={tab === "purchases" ? "Henüz bir alışın yok" : "Henüz bir satışın yok"}
            description={
              tab === "purchases"
                ? "Teklifin kabul edildiğinde anlaşma burada belirir."
                : "Bir teklifi kabul ettiğinde anlaşma burada belirir."
            }
            ctaLabel="Ürünleri Keşfet"
            ctaHref="/listings"
          />
        ) : (
          <div className="space-y-3">
            {visible.map((deal) => (
              <Link
                key={String(deal.id)}
                href={`/deals/${deal.id}`}
                className="flex items-center gap-4 border border-neutral-200 bg-surface p-3 hover:border-primary transition-colors"
              >
                <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-neutral-100">
                  {deal.product?.image_url && (
                    <Image
                      src={deal.product.image_url}
                      alt={deal.product.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink truncate">
                    {deal.product?.title ?? "Ürün bulunamadı"}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">
                    {tab === "purchases" ? "Satıcı" : "Alıcı"}: @{deal.counterpartName}
                  </p>
                  {typeof deal.price === "number" && (
                    <p className="font-semibold text-base text-ink mt-1">
                      {deal.price.toLocaleString("tr-TR")} ₺
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 border px-2 py-0.5 text-[10px] uppercase tracking-wide ${DEAL_STATUS_BADGE[deal.status]}`}
                >
                  {DEAL_STATUS_LABELS[deal.status]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
