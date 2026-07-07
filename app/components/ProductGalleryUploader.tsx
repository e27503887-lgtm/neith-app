"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";
import PhotoTagEditor, { type LocalTag, type OwnProduct } from "./PhotoTagEditor";

export type { LocalTag, OwnProduct };

export type GalleryItem = {
  id: string;
  file: File;
  previewUrl: string;
};

// A very light, rounded card style — a deliberate, scoped exception to the
// rest of Neith's sharp-corner/no-shadow system (see globals.css), matched
// to what this specific gallery was asked to look like.
const CARD_STYLE = "rounded-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.06)]";

export default function ProductGalleryUploader({
  items,
  onAdd,
  onRemove,
  disabled = false,
  label = "Ürünlerini Yükle",
  accept = "image/*",
  ownProducts,
  tagsByItemId,
  onTagsChange,
}: {
  items: GalleryItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  label?: string;
  accept?: string;
  ownProducts?: OwnProduct[];
  tagsByItemId?: Record<string, LocalTag[]>;
  onTagsChange?: (itemId: string, tags: LocalTag[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [taggingItemId, setTaggingItemId] = useState<string | null>(null);

  const taggingEnabled = !!ownProducts && !!onTagsChange;

  function handleClick() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length > 0) onAdd(selected);
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onRemove(id);
  }

  const taggingItem = items.find((item) => item.id === taggingItemId) ?? null;
  const taggingItemTags = taggingItemId ? tagsByItemId?.[taggingItemId] ?? [] : [];

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>

      <div
        onClick={handleClick}
        className={`${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:text-ink hover:border-ink"} bg-neutral-50 border border-neutral-200 flex items-center justify-center gap-2 py-6 text-gray-400 transition-colors duration-300 ${CARD_STYLE}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          disabled={disabled}
          onChange={handleChange}
          style={{ display: "none" }}
        />
        <Plus size={16} strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-wide">
          {disabled ? "Sınıra ulaşıldı" : items.length === 0 ? "Fotoğraf Ekle" : "Daha Fazla Ekle"}
        </span>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {items.map((item) => {
            const isVideo = item.file.type.startsWith("video");
            const tagCount = tagsByItemId?.[item.id]?.length ?? 0;

            return (
              <div key={item.id} className="flex flex-col gap-1">
                <div
                  className={`group relative aspect-square overflow-hidden bg-neutral-50 border border-neutral-200 ${CARD_STYLE}`}
                >
                  {isVideo ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <Image src={item.previewUrl} alt="Görsel" fill className="object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(e, item.id)}
                    title="Kaldır"
                    className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X size={12} strokeWidth={1.5} />
                  </button>
                </div>

                {taggingEnabled && !isVideo && (
                  <button
                    type="button"
                    onClick={() => setTaggingItemId(item.id)}
                    className="text-[10px] uppercase tracking-wide text-gray-500 hover:text-ink transition-colors text-center"
                  >
                    {tagCount > 0 ? `${tagCount} Etiket · Düzenle` : "Ürün Etiketle"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {taggingEnabled && taggingItem && (
        <PhotoTagEditor
          imageUrl={taggingItem.previewUrl}
          tags={taggingItemTags}
          ownProducts={ownProducts!}
          onAdd={(tag) =>
            onTagsChange!(taggingItem.id, [
              ...taggingItemTags,
              { ...tag, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
            ])
          }
          onRemove={(tagId) =>
            onTagsChange!(taggingItem.id, taggingItemTags.filter((t) => t.id !== tagId))
          }
          onClose={() => setTaggingItemId(null)}
        />
      )}
    </div>
  );
}
