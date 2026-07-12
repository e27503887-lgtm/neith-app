"use client";

// "+ Parça Ekle" formu — Dolabım bölümüne özel, tamamen kişisel bir kayıt
// oluşturur (wardrobe_items). Akış: önce fotoğraf kaynağı seçilir (kamera/
// galeri/kendi ilanlarından), ardından kompakt bir form devam eder — yalnızca
// Grup Etiketi ve Kategori açık, geri kalan dört chip grubu katlanabilir bir
// "Detaylar" bölümünde. Aynı modal düzenleme için de kullanılır.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronDown, Images, Camera, Tag, X } from "lucide-react";
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

type OwnProduct = {
  id: number | string;
  title: string;
  image_url: string;
  category: string | null;
  fit: Fit | null;
  fabric: Fabric | null;
  style_tag: string | null;
  era: string | null;
  dominant_color: string | null;
  color_group: ColorGroup | null;
};

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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Fotoğraf kaynağı seçilene kadar (ya da düzenleme modundaysa baştan)
  // kompakt üç seçenekli ekran gösterilir.
  const [choosingSource, setChoosingSource] = useState(!isEdit);
  const [ownProducts, setOwnProducts] = useState<OwnProduct[] | null>(null);
  const [showProductPicker, setShowProductPicker] = useState(false);

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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadOwnProducts() {
    if (ownProducts !== null) {
      setShowProductPicker(true);
      return;
    }
    supabase
      .from("products")
      .select("id, title, image_url, category, fit, fabric, style_tag, era, dominant_color, color_group")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOwnProducts((data ?? []) as OwnProduct[]);
        setShowProductPicker(true);
      });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!selected) return;

    setError("");
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);

    const nextPreview = URL.createObjectURL(selected);
    setFile(selected);
    setPreviewUrl(nextPreview);
    setChoosingSource(false);

    const hex = await extractDominantColor(selected);
    if (hex) {
      setDominantColor(hex);
      setColorGroup(deriveColorGroup(hex));
    }
  }

  // Kendi ilanından seçilince yeniden yükleme yapılmaz — fotoğraf URL'i ve
  // (varsa) kategori/kesim/kumaş/stil/dönem bilgisi doğrudan forma kopyalanır.
  function handlePickProduct(product: OwnProduct) {
    setFile(null);
    setPreviewUrl(product.image_url);
    setDominantColor(product.dominant_color);
    setColorGroup(product.color_group);
    setCategory((prev) => prev ?? product.category);
    setFit((prev) => prev ?? product.fit);
    setFabric((prev) => prev ?? product.fabric);
    setStyleTag((prev) => prev ?? product.style_tag);
    setEra((prev) => prev ?? product.era);
    setChoosingSource(false);
    setShowProductPicker(false);
  }

  function handleChangePhoto() {
    setChoosingSource(true);
    setShowProductPicker(false);
  }

  async function handleSubmit() {
    if (!isEdit && !previewUrl) {
      setError("Bir fotoğraf seç.");
      return;
    }

    setBusy(true);
    setError("");

    let imageUrl = editingItem?.image_url ?? previewUrl ?? "";

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-neutral-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isEdit ? "Parçayı düzenle" : "Parça ekle"}
      >
        <div className="flex items-start justify-between gap-4 p-6 pb-4 shrink-0">
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

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Gizli dosya girişleri — iki buton da aynı seçiciyi tetikler;
              kamera girişinde capture ipucu tarayıcıyı doğrudan kameraya
              yönlendirmeyi dener (desteklenmiyorsa galeri açılır). */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {choosingSource ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex items-center gap-3 border border-neutral-300 px-4 py-3 text-sm text-ink hover:border-ink transition-colors"
              >
                <Camera size={16} strokeWidth={1.5} />
                Fotoğraf Çek / Yükle
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-full flex items-center gap-3 border border-neutral-300 px-4 py-3 text-sm text-ink hover:border-ink transition-colors"
              >
                <Images size={16} strokeWidth={1.5} />
                Galeriden Seç
              </button>
              <button
                type="button"
                onClick={loadOwnProducts}
                disabled={ownProducts !== null && ownProducts.length === 0}
                className="w-full flex items-center gap-3 border border-neutral-300 px-4 py-3 text-sm text-ink hover:border-ink transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <Tag size={16} strokeWidth={1.5} />
                {ownProducts !== null && ownProducts.length === 0
                  ? "Henüz ilanın yok"
                  : "Ürünlerimden Seç"}
              </button>

              {showProductPicker && ownProducts && ownProducts.length > 0 && (
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {ownProducts.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => handlePickProduct(product)}
                      className="relative aspect-square overflow-hidden border border-neutral-200 hover:border-ink transition-colors"
                    >
                      <Image
                        src={product.image_url}
                        alt={product.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {previewUrl && (
                  <div className="relative w-16 h-16 shrink-0 overflow-hidden border border-neutral-200 bg-neutral-50">
                    <Image src={previewUrl} alt="Önizleme" fill sizes="64px" className="object-cover" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleChangePhoto}
                  className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
                >
                  Fotoğrafı Değiştir
                </button>
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

              <div className="border-t border-neutral-200 pt-3">
                <button
                  type="button"
                  onClick={() => setDetailsOpen((open) => !open)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-ink transition-colors"
                >
                  Detayları Ekle (opsiyonel)
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${detailsOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {detailsOpen && (
                  <div className="space-y-4 mt-4">
                    <FitPicker value={fit} onChange={setFit} />
                    <FabricPicker value={fabric} onChange={setFabric} />
                    <StyleTagPicker value={styleTag} onChange={setStyleTag} />
                    <EraPicker value={era} onChange={setEra} />
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button type="button" onClick={handleSubmit} disabled={busy} className="btn-primary w-full">
                {preparing
                  ? "Fotoğraf hazırlanıyor..."
                  : busy
                    ? "Kaydediliyor..."
                    : isEdit
                      ? "Değişiklikleri Kaydet"
                      : "Kaydet"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
