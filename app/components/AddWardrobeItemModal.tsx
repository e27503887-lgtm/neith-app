"use client";

// "+ Parça Ekle" formu — Dolabım bölümüne özel, tamamen kişisel bir kayıt
// oluşturur (wardrobe_items). Fotoğraf yüklenince mevcut canvas tabanlı
// dominant renk çıkarımı otomatik çalışır. Aynı modal düzenleme için de
// kullanılır (editingItem doluysa).

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { compressImage, UnsupportedImageError } from "../utils/compressImage";
import { extractDominantColor } from "../utils/dominantColor";
import { deriveColorGroup, type ColorGroup } from "@/lib/colors";
import type { Fit } from "@/lib/outfit-engine";
import type { Fabric } from "@/lib/fabric";
import type { WardrobeItem } from "@/lib/wardrobe";
import CategoryPicker from "./CategoryPicker";
import FitPicker from "./FitPicker";
import FabricPicker from "./FabricPicker";
import StyleTagPicker from "./StyleTagPicker";
import EraPicker from "./EraPicker";

export default function AddWardrobeItemModal({
  user,
  editingItem,
  onClose,
  onSaved,
}: {
  user: User;
  editingItem?: WardrobeItem | null;
  onClose: () => void;
  onSaved: (item: WardrobeItem) => void;
}) {
  const isEdit = !!editingItem;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(editingItem?.image_url ?? null);
  const [dominantColor, setDominantColor] = useState<string | null>(
    editingItem?.dominant_color ?? null
  );
  const [colorGroup, setColorGroup] = useState<ColorGroup | null>(editingItem?.color_group ?? null);

  const [label, setLabel] = useState(editingItem?.label ?? "");
  const [category, setCategory] = useState<string | null>(editingItem?.category ?? null);
  const [fit, setFit] = useState<Fit | null>(editingItem?.fit ?? null);
  const [fabric, setFabric] = useState<Fabric | null>(editingItem?.fabric ?? null);
  const [styleTag, setStyleTag] = useState<string | null>(editingItem?.style_tag ?? null);
  const [era, setEra] = useState<string | null>(editingItem?.era ?? null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError("Fotoğraf 5MB'dan büyük olamaz.");
      return;
    }

    setError("");
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    const nextPreview = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(nextPreview);

    const hex = await extractDominantColor(selected);
    if (hex) {
      setDominantColor(hex);
      setColorGroup(deriveColorGroup(hex));
    }
  }

  async function handleSubmit() {
    if (!isEdit && !file) {
      setError("Bir fotoğraf seç.");
      return;
    }

    setBusy(true);
    setError("");

    let imageUrl = editingItem?.image_url ?? "";

    if (file) {
      let prepared: File;
      try {
        prepared = await compressImage(file, "main");
      } catch (err) {
        setError(
          err instanceof UnsupportedImageError ? err.message : "Fotoğraf hazırlanırken bir hata oluştu."
        );
        setBusy(false);
        return;
      }

      const extension = prepared.name.split(".").pop() || "webp";
      const path = `${user.id}/wardrobe/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, prepared);

      if (uploadError) {
        setError("Fotoğraf yüklenirken bir hata oluştu: " + uploadError.message);
        setBusy(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
      imageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      user_id: user.id,
      image_url: imageUrl,
      label: label.trim() || null,
      category,
      dominant_color: dominantColor,
      color_group: colorGroup,
      fit,
      fabric,
      style_tag: styleTag,
      era,
    };

    if (isEdit) {
      const { data, error: updateError } = await supabase
        .from("wardrobe_items")
        .update(payload)
        .eq("id", editingItem!.id)
        .select("*")
        .single();

      setBusy(false);
      if (updateError || !data) {
        setError("Parça güncellenirken bir hata oluştu: " + updateError?.message);
        return;
      }
      onSaved(data as WardrobeItem);
    } else {
      const { data, error: insertError } = await supabase
        .from("wardrobe_items")
        .insert([payload])
        .select("*")
        .single();

      setBusy(false);
      if (insertError || !data) {
        setError("Parça kaydedilirken bir hata oluştu: " + insertError?.message);
        return;
      }
      onSaved(data as WardrobeItem);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isEdit ? "Parçayı düzenle" : "Parça ekle"}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="section-label mb-1">Dolabım</p>
            <h2 className="font-serif text-xl text-ink">{isEdit ? "Parçayı Düzenle" : "Parça Ekle"}</h2>
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

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {previewUrl && (
              <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-50">
                <Image src={previewUrl} alt="Önizleme" fill sizes="64px" className="object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-xs flex-1"
            />
          </div>

          {dominantColor && (
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className="w-4 h-4 rounded-full border border-neutral-300 shrink-0"
                style={{ backgroundColor: dominantColor }}
              />
              Baskın renk otomatik algılandı.
            </p>
          )}

          <input
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 60))}
            placeholder="Grup Etiketi (ör. T-shirtlerim)"
            className="w-full p-3 border border-neutral-300 bg-surface text-sm"
          />

          <CategoryPicker value={category} onChange={setCategory} />
          <FitPicker value={fit} onChange={setFit} />
          <FabricPicker value={fabric} onChange={setFabric} />
          <StyleTagPicker value={styleTag} onChange={setStyleTag} />
          <EraPicker value={era} onChange={setEra} />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button type="button" onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
            {busy ? "Kaydediliyor..." : isEdit ? "Değişiklikleri Kaydet" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
