"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import EraPicker from "../components/EraPicker";

const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
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

  const [description, setDescription] = useState("");
  const [era, setEra] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;

      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > maxSize) {
        setError(isVideo ? "Video 50MB'dan büyük olamaz." : "Fotoğraf 5MB'dan büyük olamaz.");
        continue;
      }

      accepted.push({
        file,
        previewUrl: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
      remainingSlots -= 1;
    }

    if (accepted.length > 0) {
      setMedia((prev) => [...prev, ...accepted]);
    }
  }

  function removeMedia(index: number) {
    setMedia((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    if (media.length === 0) {
      setError("En az bir fotoğraf veya video eklemelisin.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.target);
    const title = formData.get("title");
    const price = formData.get("price");
    const username = user.email?.split("@")[0] ?? "";

    const uploadedMedia: { url: string; type: "image" | "video" }[] = [];

    for (let i = 0; i < media.length; i++) {
      setUploadProgress({ current: i + 1, total: media.length });

      const item = media[i];
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
          title,
          price,
          description,
          era,
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
    media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMedia([]);
    setDescription("");
    setEra(null);
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6 pb-12">
      <div className="max-w-md mx-auto bg-paper p-8 border border-neutral-200">
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
          <input name="title" placeholder="Ürün Başlığı" className="w-full p-3 border rounded-md" required />
          <input name="price" type="number" placeholder="Fiyat (TL)" className="w-full p-3 border rounded-md" required />

          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Açıklama"
              rows={4}
              maxLength={MAX_DESCRIPTION}
              className="w-full p-3 border rounded-md resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {description.length}/{MAX_DESCRIPTION}
            </p>
          </div>

          <EraPicker value={era} onChange={setEra} />

          <div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFilesChange}
              disabled={media.length >= MAX_FILES}
              className="w-full p-3 border rounded-md disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              En fazla {MAX_FILES} medya · fotoğraf başına 5MB · video başına 50MB.
            </p>

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
                      className="absolute top-1 right-1 bg-ink/80 text-paper rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button disabled={loading} className="btn-primary w-full">
            {uploadProgress
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
