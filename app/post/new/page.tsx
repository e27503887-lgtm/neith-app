"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import {
  compressImage,
  getVideoDurationSeconds,
  UnsupportedImageError,
} from "../../utils/compressImage";
import type { User } from "@supabase/supabase-js";
import ProductGalleryUploader, {
  type GalleryItem,
  type LocalTag,
  type OwnProduct,
} from "../../components/ProductGalleryUploader";

const MAX_FILES = 6;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

async function uploadMedia(userId: string, file: File, index: number) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
  if (uploadError) return { error: uploadError };

  const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: publicUrlData.publicUrl };
}

export default function NewPostPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [tagsByItemId, setTagsByItemId] = useState<Record<string, LocalTag[]>>({});
  const [ownProducts, setOwnProducts] = useState<OwnProduct[]>([]);
  const [caption, setCaption] = useState("");

  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleAddFiles(files: File[]) {
    setError("");

    const accepted: GalleryItem[] = [];
    let remainingSlots = MAX_FILES - galleryItems.length;

    for (const file of files) {
      if (remainingSlots <= 0) {
        setError(`En fazla ${MAX_FILES} fotoğraf/video ekleyebilirsin.`);
        break;
      }

      const isVideo = file.type.startsWith("video");
      const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > limit) {
        setError(isVideo ? "Her video 25MB'dan küçük olmalı." : "Her fotoğraf 8MB'dan küçük olmalı.");
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
    setTagsByItemId((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleTagsChange(itemId: string, tags: LocalTag[]) {
    setTagsByItemId((prev) => ({ ...prev, [itemId]: tags }));
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    if (galleryItems.length === 0) {
      setError("Lütfen en az bir fotoğraf veya video yükle.");
      return;
    }

    setLoading(true);
    setError("");
    setPreparing(true);

    // Fotoğrafları yüklemeden önce tarayıcıda küçült + WebP'ye çevir
    // (videolar dokunulmadan geçer).
    let preparedFiles: File[];
    try {
      preparedFiles = await Promise.all(
        galleryItems.map((item) => compressImage(item.file, "main"))
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
    setUploading(true);

    const uploadResults = await Promise.all(
      preparedFiles.map((file, i) => uploadMedia(user.id, file, i))
    );

    setUploading(false);

    const failed = uploadResults.find((r) => r.error);
    if (failed?.error) {
      setError("Yükleme sırasında bir hata oluştu: " + failed.error.message);
      setLoading(false);
      return;
    }

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert([{ user_id: user.id, caption: caption.trim() || null }])
      .select("id")
      .single();

    if (insertError || !post) {
      setError("Gönderi paylaşılırken bir hata oluştu: " + insertError?.message);
      setLoading(false);
      return;
    }

    const mediaRows = galleryItems.map((item, index) => ({
      post_id: post.id,
      media_url: uploadResults[index].url!,
      media_type: item.file.type.startsWith("video") ? "video" : "image",
      position: index,
    }));

    const { data: insertedMedia, error: mediaError } = await supabase
      .from("post_media")
      .insert(mediaRows)
      .select("id, position");

    if (mediaError || !insertedMedia) {
      setError("Görseller kaydedilirken bir hata oluştu: " + mediaError?.message);
      setLoading(false);
      return;
    }

    const mediaIdByPosition = new Map(insertedMedia.map((m) => [m.position, m.id]));
    const tagRows = galleryItems.flatMap((item, index) => {
      const mediaId = mediaIdByPosition.get(index);
      if (!mediaId) return [];
      return (tagsByItemId[item.id] ?? []).map((tag) => ({
        post_media_id: mediaId,
        product_id: tag.product_id,
        x_percent: tag.x_percent,
        y_percent: tag.y_percent,
      }));
    });

    if (tagRows.length > 0) {
      const { error: tagError } = await supabase.from("photo_tags").insert(tagRows);
      if (tagError) {
        setError("Ürün etiketleri kaydedilirken bir hata oluştu: " + tagError.message);
        setLoading(false);
        return;
      }
    }

    router.push(`/post/${post.id}`);
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6 pb-12">
      <div className="max-w-md mx-auto bg-paper p-8 rounded-xl shadow-sm border border-neutral-200">
        <h1 className="text-xl font-bold mb-6">Gönderi Paylaş</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <ProductGalleryUploader
              items={galleryItems}
              onAdd={handleAddFiles}
              onRemove={handleRemoveItem}
              disabled={galleryItems.length >= MAX_FILES}
              label="Fotoğraf veya Video Ekle"
              accept="image/*,video/*"
              ownProducts={ownProducts}
              tagsByItemId={tagsByItemId}
              onTagsChange={handleTagsChange}
            />
            <p className="text-xs text-gray-400 mt-1">
              1-6 fotoğraf/video · fotoğraflar 8MB&apos;dan, videolar 25MB&apos;dan küçük ve en
              fazla 60 saniye olmalı. Fotoğraflar yüklenmeden önce otomatik küçültülür.
            </p>
          </div>

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Bir şeyler yaz... (opsiyonel)"
            rows={3}
            className="w-full p-3 border rounded-md resize-none"
          />

          <button disabled={loading} className="btn-primary w-full">
            {preparing
              ? "Fotoğraf hazırlanıyor..."
              : uploading
              ? "Yükleniyor..."
              : loading
              ? "Paylaşılıyor..."
              : "Paylaş"}
          </button>
        </form>
      </div>
    </main>
  );
}
