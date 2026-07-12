"use client";

// "+ Kombin Ekle" — iki yol aynı formda bir arada sunulur (kombine
// edilebilir): ayna fotoğrafı yükleme (opsiyonel not) ve/veya dolaptaki
// parçalardan çoklu seçim. En az 2 parça seçilirse uyum skoru otomatik
// hesaplanır; fotoğraf tek başınaysa (0-1 parça) skor null kalır.

import { useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { compressImage, UnsupportedImageError } from "../utils/compressImage";
import { computeWardrobeInsight, type PersonalOutfit, type WardrobeItem } from "@/lib/wardrobe";

export default function AddPersonalOutfitModal({
  user,
  wardrobeItems,
  onClose,
  onSaved,
}: {
  user: User;
  wardrobeItems: WardrobeItem[];
  onClose: () => void;
  onSaved: (outfit: PersonalOutfit, items: WardrobeItem[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) return;

    setError("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  function toggleItem(id: number | string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!file && selectedIds.size === 0) {
      setError("Bir fotoğraf yükle ya da en az bir parça seç.");
      return;
    }

    setBusy(true);
    setError("");

    let photoUrl: string | null = null;

    if (file) {
      let prepared: File;
      try {
        setPreparing(true);
        prepared = await compressImage(file, "main");
      } catch (err) {
        setError(
          err instanceof UnsupportedImageError ? err.message : "Fotoğraf hazırlanırken bir hata oluştu."
        );
        setPreparing(false);
        setBusy(false);
        return;
      }
      setPreparing(false);

      const extension = prepared.name.split(".").pop() || "webp";
      const path = `${user.id}/personal-outfits/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, prepared);

      if (uploadError) {
        setError("Fotoğraf yüklenirken bir hata oluştu: " + uploadError.message);
        setBusy(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
      photoUrl = publicUrlData.publicUrl;
    }

    const selectedItems = wardrobeItems.filter((i) => selectedIds.has(i.id));
    const insight = computeWardrobeInsight(selectedItems);

    const { data: outfit, error: insertError } = await supabase
      .from("personal_outfits")
      .insert([
        {
          user_id: user.id,
          photo_url: photoUrl,
          note: note.trim() || null,
          compatibility_score: insight?.score ?? null,
        },
      ])
      .select("*")
      .single();

    if (insertError || !outfit) {
      setError("Kombin kaydedilirken bir hata oluştu: " + insertError?.message);
      setBusy(false);
      return;
    }

    if (selectedItems.length > 0) {
      const rows = selectedItems.map((item) => ({
        personal_outfit_id: outfit.id,
        wardrobe_item_id: item.id,
      }));
      const { error: itemsError } = await supabase.from("personal_outfit_items").insert(rows);

      if (itemsError) {
        setError("Parçalar kaydedilirken bir hata oluştu: " + itemsError.message);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    onSaved(outfit as PersonalOutfit, selectedItems);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Kombin ekle"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="section-label mb-1">Kombinlerim</p>
            <h2 className="font-serif text-xl text-ink">Kombin Ekle</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="text-gray-500 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Ayna Fotoğrafı Yükle</p>
            <div className="flex items-center gap-3">
              {previewUrl && (
                <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-50">
                  <Image src={previewUrl} alt="Önizleme" fill sizes="64px" className="object-cover" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs flex-1" />
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="Not (opsiyonel)"
              rows={2}
              className="w-full mt-2 p-3 border border-neutral-300 bg-surface text-sm resize-none"
            />
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Parçalardan Oluştur{" "}
              <span className="text-xs text-gray-500 font-normal">(opsiyonel — ikisi bir arada olabilir)</span>
            </p>
            {wardrobeItems.length === 0 ? (
              <p className="text-sm text-gray-500">Dolabında henüz parça yok.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {wardrobeItems.map((item) => {
                  const selected = selectedIds.has(item.id);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`relative aspect-square overflow-hidden border-2 ${
                        selected ? "border-ink" : "border-transparent"
                      }`}
                    >
                      <Image
                        src={item.image_url}
                        alt={item.label ?? "Dolap parçası"}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                      {selected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check size={18} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedIds.size === 1 && (
              <p className="text-xs text-gray-500 mt-2">
                Uyum skoru için en az 2 parça seç — tek parçada skor hesaplanmaz.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="button" onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
            {preparing ? "Fotoğraf hazırlanıyor..." : busy ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
