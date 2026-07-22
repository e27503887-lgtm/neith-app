"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { supabase } from "../utils/supabase";
import {
  compressImage,
  getVideoDurationSeconds,
  isImageFile,
  UnsupportedImageError,
} from "../utils/compressImage";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import EraPicker from "../components/EraPicker";
import CategoryPicker from "../components/CategoryPicker";
import StyleTagPicker from "../components/StyleTagPicker";
import FitPicker from "../components/FitPicker";
import FabricPicker from "../components/FabricPicker";
import PhotoTipCard from "../components/PhotoTipCard";
import FieldHint from "../components/FieldHint";

function validateTitle(value: string): string | null {
  if (!value.trim()) return "Başlık gerekli.";
  if (value.trim().length < 3) return "Başlık en az 3 karakter olmalı.";
  return null;
}

function validatePrice(value: string): string | null {
  if (!value.trim()) return "Fiyat gerekli.";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return "Geçerli bir fiyat gir (0'dan büyük).";
  return null;
}
import { extractDominantColor } from "../utils/dominantColor";
import { detectCategory } from "@/lib/category-detection";
import {
  COLOR_GROUP_LABELS,
  PRESET_COLORS,
  deriveColorGroup,
  type ColorGroup,
} from "@/lib/colors";
import type { Fit } from "@/lib/outfit-engine";
import type { Fabric } from "@/lib/fabric";

const MAX_FILES = 5;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;
const MAX_DESCRIPTION = 2000;

type MediaItem = {
  file: File;
  previewUrl: string;
  type: "image" | "video";
};

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [touched, setTouched] = useState({ title: false, price: false });
  const [description, setDescription] = useState("");
  const [era, setEra] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [styleTag, setStyleTag] = useState<string | null>(null);
  const [fit, setFit] = useState<Fit | null>(null);
  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [colorGroup, setColorGroup] = useState<ColorGroup | null>(null);
  const [colorManual, setColorManual] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [categoryAutoDetected, setCategoryAutoDetected] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [preparing, setPreparing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const titleError = validateTitle(title);
  const priceError = validatePrice(price);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUser(data.user);
      setCheckingAuth(false);
    });
  }, [router]);

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";

    if (selected.length === 0) return;

    setError("");

    const accepted: MediaItem[] = [];
    let remainingSlots = MAX_FILES - media.length;

    for (const file of selected) {
      if (remainingSlots <= 0) {
        setError(`En fazla ${MAX_FILES} medya ekleyebilirsin.`);
        break;
      }

      const isVideo = file.type.startsWith("video/");
      const isImage = isImageFile(file);
      if (!isVideo && !isImage) continue;

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        setError("Video 25MB'dan büyük olamaz.");
        continue;
      }

      if (isVideo) {
        const duration = await getVideoDurationSeconds(file);
        if (duration > MAX_VIDEO_SECONDS) {
          setError(`Videolar en fazla ${MAX_VIDEO_SECONDS} saniye olabilir.`);
          continue;
        }
      }

      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
      remainingSlots -= 1;
    }

    if (accepted.length > 0) {
      const next = [...media, ...accepted];
      setMedia(next);
      void updateAutoColor(next);
      void updateAutoCategory(next);
    }
  }

  // Kapak fotoğrafından dominant rengi hesaplar; kullanıcı elle renk
  // seçtiyse otomatik tespit üzerine yazmaz.
  async function updateAutoColor(items: MediaItem[]) {
    if (colorManual) return;
    const firstImage = items.find((m) => m.type === "image");
    if (!firstImage) {
      setDominantColor(null);
      setColorGroup(null);
      return;
    }
    const hex = await extractDominantColor(firstImage.file);
    if (hex) {
      setDominantColor(hex);
      setColorGroup(deriveColorGroup(hex));
    }
  }

  // Kapak fotoğrafından kategori tahmin eder (MobileNet, tamamen istemci
  // tarafında). Kullanıcı kategoriyi elle değiştirdiyse üzerine yazmaz.
  async function updateAutoCategory(items: MediaItem[]) {
    const firstImage = items.find((m) => m.type === "image");
    if (!firstImage) return;

    setAnalyzingPhoto(true);
    const prediction = await detectCategory(firstImage.file);
    setAnalyzingPhoto(false);

    if (prediction) {
      setCategory(prediction.category);
      setCategoryAutoDetected(true);
    }
  }

  function removeMedia(index: number) {
    const target = media[index];
    if (target) URL.revokeObjectURL(target.previewUrl);
    const next = media.filter((_, i) => i !== index);
    setMedia(next);
    void updateAutoColor(next);
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    if (titleError || priceError) {
      setTouched({ title: true, price: true });
      return;
    }

    if (media.length === 0) {
      setError("En az bir fotoğraf veya video eklemelisin.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const username = user.email?.split("@")[0] ?? "";

    // Fotoğrafları yüklemeden önce tarayıcıda küçült + WebP'ye çevir
    // (videolar dokunulmadan geçer).
    let preparedMedia: MediaItem[];
    try {
      setPreparing(true);
      preparedMedia = await Promise.all(
        media.map(async (item) => ({
          ...item,
          file: await compressImage(item.file, "main"),
        }))
      );
    } catch (err) {
      setError(
        err instanceof UnsupportedImageError
          ? err.message
          : "Fotoğraf hazırlanırken bir hata oluştu."
      );
      setPreparing(false);
      setLoading(false);
      return;
    }
    setPreparing(false);

    const uploadedMedia: { url: string; type: "image" | "video" }[] = [];

    for (let i = 0; i < preparedMedia.length; i++) {
      setUploadProgress({ current: i + 1, total: preparedMedia.length });

      const item = preparedMedia[i];
      const extension = item.file.name.split(".").pop() || (item.type === "video" ? "mp4" : "jpg");
      const path = `${user.id}/${Date.now()}-${i}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, item.file);

      if (uploadError) {
        setUploadProgress(null);
        setError("Medya yüklenirken bir hata oluştu: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      uploadedMedia.push({ url: publicUrlData.publicUrl, type: item.type });
    }

    setUploadProgress(null);

    const coverImage = uploadedMedia.find((m) => m.type === "image")?.url ?? uploadedMedia[0].url;

    const { data: insertedProduct, error: insertError } = await supabase
      .from("products")
      .insert([
        {
          title: title.trim(),
          price: Number(price),
          description,
          era,
          category,
          style_tag: styleTag,
          fit,
          fabric,
          dominant_color: dominantColor,
          color_group: colorGroup,
          image_url: coverImage,
          username,
          user_id: user.id,
        },
      ])
      .select("id")
      .single();

    if (insertError || !insertedProduct) {
      setError("İlan yayınlanırken bir hata oluştu: " + insertError?.message);
      setLoading(false);
      return;
    }

    const mediaRows = uploadedMedia.map((m, index) => ({
      product_id: insertedProduct.id,
      media_url: m.url,
      media_type: m.type,
      position: index,
    }));

    const { error: mediaError } = await supabase.from("product_media").insert(mediaRows);

    setLoading(false);

    if (mediaError) {
      setError("Medya kaydedilirken bir hata oluştu: " + mediaError.message);
      return;
    }

    setSuccess(true);
    e.target.reset();
    setTitle("");
    setPrice("");
    setTouched({ title: false, price: false });
    media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMedia([]);
    setDescription("");
    setEra(null);
    setCategory(null);
    setStyleTag(null);
    setFit(null);
    setFabric(null);
    setDominantColor(null);
    setColorGroup(null);
    setColorManual(false);
    setPaletteOpen(false);
    setCategoryAutoDetected(false);
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6 pb-12">
      <div className="max-w-md mx-auto bg-surface p-8 border border-neutral-200">
        <div className="flex gap-6 border-b border-neutral-200 mb-6">
          <span className="pb-3 -mb-px border-b-2 border-accent text-sm font-medium text-ink">
            Ürün
          </span>
          <Link
            href="/outfit/new"
            className="pb-3 -mb-px border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-accent transition-colors"
          >
            Kombin
          </Link>
        </div>

        <h1 className="text-xl font-bold mb-6">Yeni İlan Ekle</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4">İlanınız yayınlandı!</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              name="title"
              placeholder="Ürün Başlığı"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              className="w-full p-3 border rounded-md"
              required
            />
            <FieldHint error={touched.title ? titleError : null} valid={touched.title && !titleError} />
          </div>
          <div>
            <input
              name="price"
              type="number"
              placeholder="Fiyat (TL)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, price: true }))}
              className="w-full p-3 border rounded-md"
              required
            />
            <FieldHint error={touched.price ? priceError : null} valid={touched.price && !priceError} />
          </div>

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Açıklama"
              rows={4}
              maxLength={MAX_DESCRIPTION}
              className="w-full p-3 border rounded-md resize-none"
            />
            <p className="text-xs text-gray-500 text-right mt-1">
              {description.length}/{MAX_DESCRIPTION}
            </p>
          </div>

          <EraPicker value={era} onChange={setEra} />

          <CategoryPicker
            value={category}
            onChange={(v) => {
              setCategory(v);
              setCategoryAutoDetected(false);
            }}
            autoDetected={categoryAutoDetected}
          />

          <FitPicker value={fit} onChange={setFit} />

          <StyleTagPicker value={styleTag} onChange={setStyleTag} />

          <FabricPicker value={fabric} onChange={setFabric} />

          <PhotoTipCard />

          <div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFilesChange}
              disabled={media.length >= MAX_FILES}
              className="w-full p-3 border rounded-md disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              En fazla {MAX_FILES} medya · video başına 25MB.
            </p>

            {analyzingPhoto && (
              <p className="text-xs text-gray-500 mt-2">
                Fotoğraf işleniyor... (ilk kullanımda birkaç saniye sürebilir)
              </p>
            )}

            {dominantColor && (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaletteOpen((open) => !open)}
                    className="flex items-center gap-2 group"
                    aria-label="Baskın rengi düzelt"
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-neutral-300 shrink-0"
                      style={{ backgroundColor: dominantColor }}
                    />
                    <span className="text-xs text-gray-500 group-hover:text-ink transition-colors">
                      Baskın renk{colorGroup ? ` · ${COLOR_GROUP_LABELS[colorGroup]}` : ""} —
                      dokunarak düzelt
                    </span>
                  </button>
                </div>
                {paletteOpen && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        title={preset.label}
                        onClick={() => {
                          setDominantColor(preset.hex);
                          setColorGroup(preset.group);
                          setColorManual(true);
                          setPaletteOpen(false);
                        }}
                        className={`w-7 h-7 rounded-full border transition-transform hover:scale-110 ${
                          dominantColor === preset.hex
                            ? "border-primary ring-1 ring-ink"
                            : "border-neutral-300"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {media.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {media.map((item, index) => (
                  <div
                    key={index}
                    className="relative aspect-square overflow-hidden border border-neutral-200"
                  >
                    {item.type === "video" ? (
                      <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <Image
                        src={item.previewUrl}
                        alt={`Önizleme ${index + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute top-1 right-1 bg-black/80 text-paper rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button disabled={loading} className="btn-primary w-full">
            {preparing
              ? "Fotoğraf hazırlanıyor..."
              : uploadProgress
                ? `${uploadProgress.current}/${uploadProgress.total} yükleniyor...`
                : loading
                  ? "Ekleniyor..."
                  : "İlanı Yayınla"}
          </button>
        </form>
      </div>
    </main>
  );
}
