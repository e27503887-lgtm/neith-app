"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import EraPicker from "../../components/EraPicker";
import StyleTagPicker from "../../components/StyleTagPicker";
import ProductGalleryUploader, { type GalleryItem } from "../../components/ProductGalleryUploader";

const MAX_FILES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_LABEL_LENGTH = 100;

type OwnProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

type CustomPiece = {
  id: string;
  file: File;
  previewUrl: string;
  label: string;
};

async function uploadImage(userId: string, file: File, index: number) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
  if (uploadError) return { error: uploadError };

  const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: publicUrlData.publicUrl };
}

export default function NewOutfitPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [ownProducts, setOwnProducts] = useState<OwnProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

  const [customPieces, setCustomPieces] = useState<CustomPiece[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  const [era, setEra] = useState<string | null>(null);
  const [styleTag, setStyleTag] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);

      const { data: products } = await supabase
        .from("products")
        .select("id, title, price, image_url")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      setOwnProducts(products ?? []);
      setCheckingAuth(false);
    });
  }, [router]);

  function toggleProduct(id: number | string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleAddFiles(files: File[]) {
    setError("");

    const accepted: GalleryItem[] = [];
    let remainingSlots = MAX_FILES - galleryItems.length;

    for (const file of files) {
      if (remainingSlots <= 0) {
        setError(`En fazla ${MAX_FILES} fotoğraf ekleyebilirsin.`);
        break;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Her fotoğraf 5MB'dan küçük olmalı.");
        continue;
      }

      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
      remainingSlots -= 1;
    }

    if (accepted.length > 0) {
      setGalleryItems((prev) => [...prev, ...accepted]);
    }
  }

  function handleRemoveItem(id: string) {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function handleCustomFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError("Fotoğraf 5MB'dan küçük olmalı.");
      return;
    }

    setError("");
    if (customPreview) URL.revokeObjectURL(customPreview);
    setCustomFile(file);
    setCustomPreview(URL.createObjectURL(file));
  }

  function closeCustomForm() {
    if (customPreview) URL.revokeObjectURL(customPreview);
    setCustomFile(null);
    setCustomPreview(null);
    setCustomLabel("");
    setShowCustomForm(false);
  }

  function handleAddCustomPiece() {
    if (!customFile || !customPreview) {
      setError("Önce bir fotoğraf seç.");
      return;
    }
    if (!customLabel.trim()) {
      setError("Kısa bir etiket yaz.");
      return;
    }

    setCustomPieces((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        file: customFile,
        previewUrl: customPreview,
        label: customLabel.trim().slice(0, MAX_LABEL_LENGTH),
      },
    ]);

    setCustomFile(null);
    setCustomPreview(null);
    setCustomLabel("");
    setShowCustomForm(false);
    setError("");
  }

  function handleRemoveCustomPiece(id: string) {
    setCustomPieces((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((c) => c.id !== id);
    });
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    if (galleryItems.length === 0) {
      setError("Lütfen en az bir ürün fotoğrafı yükle.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.target);
    const title = formData.get("title");
    const description = formData.get("description");

    setUploading(true);

    const [galleryUploadResults, customUploadResults] = await Promise.all([
      Promise.all(galleryItems.map((item, i) => uploadImage(user.id, item.file, i))),
      Promise.all(customPieces.map((c, i) => uploadImage(user.id, c.file, i))),
    ]);

    setUploading(false);

    const failedGallery = galleryUploadResults.find((r) => r.error);
    if (failedGallery?.error) {
      setError("Fotoğraf yüklenirken bir hata oluştu: " + failedGallery.error.message);
      setLoading(false);
      return;
    }

    const failedCustom = customUploadResults.find((r) => r.error);
    if (failedCustom?.error) {
      setError("Özel parça fotoğrafı yüklenirken bir hata oluştu: " + failedCustom.error.message);
      setLoading(false);
      return;
    }

    const imageUrls = galleryUploadResults.map((r) => r.url!);
    const customImageUrls = customUploadResults.map((r) => r.url!);

    const { data: outfit, error: insertError } = await supabase
      .from("outfits")
      .insert([
        {
          user_id: user.id,
          title,
          description,
          era,
          style_tag: styleTag,
          image_url: imageUrls[0],
        },
      ])
      .select("id")
      .single();

    if (insertError || !outfit) {
      setError("Kombin paylaşılırken bir hata oluştu: " + insertError?.message);
      setLoading(false);
      return;
    }

    const { error: mediaError } = await supabase.from("outfit_media").insert(
      imageUrls.map((url, index) => ({
        outfit_id: outfit.id,
        media_url: url,
        media_type: "image",
        position: index,
      }))
    );

    if (mediaError) {
      setError("Ürün görselleri kaydedilirken bir hata oluştu: " + mediaError.message);
      setLoading(false);
      return;
    }

    const items = [
      ...[...selectedIds].map((productId) => ({
        outfit_id: outfit.id,
        product_id: productId,
      })),
      ...customPieces.map((c, i) => ({
        outfit_id: outfit.id,
        product_id: null,
        custom_image_url: customImageUrls[i],
        custom_label: c.label,
      })),
    ];

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("outfit_items").insert(items);

      if (itemsError) {
        setError("Parçalar eklenirken bir hata oluştu: " + itemsError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSuccess(true);
    router.push(`/outfit/${outfit.id}`);
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6 pb-12">
      <div className="max-w-md mx-auto bg-paper p-8 rounded-xl shadow-sm border border-neutral-200">
        <div className="flex gap-6 border-b border-neutral-200 mb-6">
          <Link href="/sell" className="pb-3 -mb-px border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-accent transition-colors">
            Ürün
          </Link>
          <span className="pb-3 -mb-px border-b-2 border-accent text-sm font-medium text-ink">
            Kombin
          </span>
        </div>

        <h1 className="text-xl font-bold mb-6">Kombin Paylaş</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-4">Kombin paylaşıldı!</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="title" placeholder="Kombin Başlığı" className="w-full p-3 border rounded-md" required />
          <textarea
            name="description"
            placeholder="Açıklama"
            rows={3}
            className="w-full p-3 border rounded-md resize-none"
          />

          <EraPicker value={era} onChange={setEra} />
          <StyleTagPicker value={styleTag} onChange={setStyleTag} />

          <div>
            <ProductGalleryUploader
              items={galleryItems}
              onAdd={handleAddFiles}
              onRemove={handleRemoveItem}
              disabled={galleryItems.length >= MAX_FILES}
            />
            <p className="text-xs text-gray-400 mt-1">
              En fazla {MAX_FILES} fotoğraf · her biri 5MB'dan küçük olmalı.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Parçaları Seç</p>
              <button
                type="button"
                onClick={() => (showCustomForm ? closeCustomForm() : setShowCustomForm(true))}
                className="text-xs uppercase tracking-wide text-accent hover:text-ink transition-colors"
              >
                {showCustomForm ? "Vazgeç" : "+ Satılık Olmayan Parça Ekle"}
              </button>
            </div>

            {showCustomForm && (
              <div className="border border-neutral-200 p-3 mb-3 space-y-2">
                <div className="flex items-center gap-3">
                  {customPreview && (
                    <div className="relative w-14 h-14 shrink-0 overflow-hidden bg-neutral-50 border border-neutral-200">
                      <Image src={customPreview} alt="Önizleme" fill sizes="56px" className="object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomFileChange}
                    className="text-xs flex-1"
                  />
                </div>
                <input
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value.slice(0, MAX_LABEL_LENGTH))}
                  placeholder="Kısa etiket (ör. Annemden kalan kolye)"
                  className="w-full p-2 border border-neutral-200 text-sm focus:outline-none focus:border-ink transition-colors"
                />
                <p className="text-xs text-gray-400 text-right">
                  {customLabel.length}/{MAX_LABEL_LENGTH}
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomPiece}
                  className="text-xs uppercase tracking-wide border border-ink text-ink px-3 py-1.5 hover:bg-ink hover:text-paper transition-colors"
                >
                  Ekle
                </button>
              </div>
            )}

            {ownProducts.length === 0 && customPieces.length === 0 ? (
              <p className="text-sm text-gray-500">
                Henüz bir ilanın yok.{" "}
                <Link href="/sell" className="underline hover:text-accent transition-colors">
                  Önce ürün ekle
                </Link>
                .
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {ownProducts.map((p) => {
                  const selected = selectedIds.has(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 ${
                        selected ? "border-ink" : "border-transparent"
                      }`}
                    >
                      <Image
                        src={p.image_url}
                        alt={p.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                      {selected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check size={18} className="text-paper" />
                        </div>
                      )}
                    </button>
                  );
                })}

                {customPieces.map((c) => (
                  <div
                    key={c.id}
                    className="relative aspect-square overflow-hidden rounded-md border-2 border-dashed border-neutral-300"
                  >
                    <Image src={c.previewUrl} alt={c.label} fill sizes="80px" className="object-cover" />
                    <span className="absolute top-0.5 left-0.5 bg-ink/80 text-paper text-[8px] uppercase tracking-wide px-1 py-0.5">
                      Satılık Değil
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomPiece(c.id)}
                      className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-paper"
                    >
                      <X size={10} strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button disabled={loading} className="btn-primary w-full">
            {uploading ? "Fotoğraflar yükleniyor..." : loading ? "Paylaşılıyor..." : "Kombini Paylaş"}
          </button>
        </form>
      </div>
    </main>
  );
}
