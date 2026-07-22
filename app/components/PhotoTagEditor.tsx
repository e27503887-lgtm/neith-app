"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

export type OwnProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

export type LocalTag = {
  id: string;
  x_percent: number;
  y_percent: number;
  product_id: number | string;
  title: string;
  price: number;
  image_url: string;
};

const MAX_TAGS_PER_PHOTO = 6;

export default function PhotoTagEditor({
  imageUrl,
  tags,
  ownProducts,
  onAdd,
  onRemove,
  onClose,
}: {
  imageUrl: string;
  tags: LocalTag[];
  ownProducts: OwnProduct[];
  onAdd: (tag: Omit<LocalTag, "id">) => void;
  onRemove: (tagId: string) => void;
  onClose: () => void;
}) {
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [openRemoveId, setOpenRemoveId] = useState<string | null>(null);
  const [limitError, setLimitError] = useState("");

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    setOpenRemoveId(null);

    if (tags.length >= MAX_TAGS_PER_PHOTO) {
      setLimitError(`Bir fotoğrafa en fazla ${MAX_TAGS_PER_PHOTO} ürün etiketleyebilirsin.`);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

    setLimitError("");
    setQuery("");
    setPendingPoint({ x: xPercent, y: yPercent });
  }

  function handleSelectProduct(product: OwnProduct) {
    if (!pendingPoint) return;
    onAdd({
      x_percent: pendingPoint.x,
      y_percent: pendingPoint.y,
      product_id: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
    });
    setPendingPoint(null);
  }

  const filteredProducts = ownProducts.filter((p) =>
    p.title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))
  );

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Kapat"
        className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-paper text-ink"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      <div className="flex flex-col items-center gap-3 max-w-full">
        <div
          className="relative inline-block max-h-[70vh] max-w-full cursor-crosshair"
          onClick={handleImageClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Etiketlenecek fotoğraf"
            className="block max-h-[70vh] w-auto max-w-full select-none"
            draggable={false}
          />

          {tags.map((tag) => (
            <div
              key={tag.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${tag.x_percent}%`, top: `${tag.y_percent}%` }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingPoint(null);
                  setOpenRemoveId((id) => (id === tag.id ? null : tag.id));
                }}
                aria-label={tag.title}
                className="relative flex h-7 w-7 items-center justify-center"
              >
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/70 animate-ping" />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
              </button>

              {openRemoveId === tag.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(tag.id);
                    setOpenRemoveId(null);
                  }}
                  className="absolute left-1/2 top-full mt-1 flex min-h-11 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-dark-3 px-3 py-2 text-xs text-white"
                >
                  Kaldır
                </button>
              )}
            </div>
          ))}

          {pendingPoint && (
            <div
              className={`absolute z-10 w-56 max-w-[70vw] -translate-x-1/2 border border-neutral-200 bg-surface p-2 shadow-lg ${
                pendingPoint.y > 60 ? "-translate-y-full -mt-2" : "mt-2"
              }`}
              style={{ left: `${pendingPoint.x}%`, top: `${pendingPoint.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              {ownProducts.length === 0 ? (
                <div className="p-2 text-center">
                  <p className="mb-2 text-xs text-gray-500">Etiketlenecek ilanın yok.</p>
                  <Link
                    href="/sell"
                    className="text-xs uppercase tracking-wide text-accent transition-colors hover:text-ink"
                  >
                    Ürün Ekle
                  </Link>
                </div>
              ) : (
                <>
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ürün ara..."
                    className="mb-2 w-full border border-neutral-200 p-2 text-sm transition-colors focus:border-primary focus:outline-none"
                  />
                  <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-500">Sonuç yok.</p>
                    ) : (
                      filteredProducts.map((product) => (
                        <button
                          type="button"
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="flex items-center gap-2 p-1.5 text-left transition-colors hover:bg-neutral-50"
                        >
                          <span className="relative h-9 w-9 shrink-0 overflow-hidden bg-neutral-100">
                            <Image src={product.image_url} alt={product.title} fill sizes="36px" className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-ink">{product.title}</span>
                            <span className="block text-[11px] text-gray-500">
                              {product.price.toLocaleString("tr-TR")} ₺
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingPoint(null)}
                    className="mt-2 w-full py-1 text-xs uppercase tracking-wide text-gray-500 transition-colors hover:text-ink"
                  >
                    Vazgeç
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {limitError && <p className="text-xs text-red-300">{limitError}</p>}
        <p className="text-xs text-white/70">{tags.length}/{MAX_TAGS_PER_PHOTO} etiket · fotoğrafa dokunarak ürün ekle</p>
      </div>
    </div>
  );
}
