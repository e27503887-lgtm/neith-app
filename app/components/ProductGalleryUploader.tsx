"use client";

import { useRef } from "react";
import Image from "next/image";
import { Plus, X } from "lucide-react";

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
}: {
  items: GalleryItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
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

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Ürünlerini Yükle</p>

      <div
        onClick={handleClick}
        className={`cursor-pointer bg-neutral-50 border border-neutral-200 flex items-center justify-center gap-2 py-6 text-gray-400 hover:text-ink hover:border-ink transition-colors duration-300 ${CARD_STYLE}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          style={{ display: "none" }}
        />
        <Plus size={16} strokeWidth={1.5} />
        <span className="text-xs uppercase tracking-wide">
          {items.length === 0 ? "Fotoğraf Ekle" : "Daha Fazla Ekle"}
        </span>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group relative aspect-square overflow-hidden bg-neutral-50 border border-neutral-200 ${CARD_STYLE}`}
            >
              <Image src={item.previewUrl} alt="Ürün görseli" fill className="object-cover" />
              <button
                type="button"
                onClick={(e) => handleRemove(e, item.id)}
                title="Kaldır"
                className="absolute top-1.5 right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
