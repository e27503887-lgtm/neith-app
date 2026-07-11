// Anlaşma (deal) alan bilgisi — tipler, durum etiketleri, kargo firmaları.
// deals satırları DB tarafında teklif kabul tetikleyicisiyle doğar; uygulama
// yalnızca durum ilerletir: agreed → shipped → completed / cancelled.

export type DealStatus = "agreed" | "shipped" | "completed" | "cancelled";

export type Deal = {
  id: number | string;
  product_id: number | string;
  buyer_id: string;
  seller_id: string;
  price: number | null;
  status: DealStatus;
  shipping_carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  completed_at: string | null;
};

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  agreed: "Anlaşıldı",
  shipped: "Kargoda",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

// Rozet renkleri: editoryal, pastel değil — ince çerçeveli metin rozetleri.
export const DEAL_STATUS_BADGE: Record<DealStatus, string> = {
  agreed: "border-neutral-300 text-gray-600",
  shipped: "border-accent text-accent",
  completed: "border-ink text-ink",
  cancelled: "border-neutral-300 text-gray-500 line-through",
};

export const SHIPPING_CARRIERS = [
  "Yurtiçi",
  "Aras",
  "MNG",
  "PTT",
  "Sürat",
  "Diğer",
] as const;

// 3 adımlı durum göstergesi (iptal ayrı bant olarak gösterilir).
export const DEAL_STEPS: { status: DealStatus; label: string }[] = [
  { status: "agreed", label: "Anlaşıldı" },
  { status: "shipped", label: "Kargoda" },
  { status: "completed", label: "Tamamlandı" },
];

export function dealStepIndex(status: DealStatus): number {
  if (status === "completed") return 2;
  if (status === "shipped") return 1;
  return 0;
}
