"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";
import EraPicker from "../../components/EraPicker";
import StyleTagPicker from "../../components/StyleTagPicker";
import ProductGalleryUploader, { type GalleryItem } from "../../components/ProductGalleryUploader";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

type OwnProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

export default function NewOutfitPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [ownProducts, setOwnProducts] = useState<OwnProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());

  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);

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
    const oversized = files.some((f) => f.size > MAX_FILE_SIZE);
    if (oversized) {
      setError("Her fotoğraf 5MB'dan küçük olmalı.");
    } else {
      setError("");
    }

    const accepted = files.filter((f) => f.size <= MAX_FILE_SIZE);
    const newItems: GalleryItem[] = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setGalleryItems((prev) => [...prev, ...newItems]);
  }

  function handleRemoveItem(id: string) {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
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

    const uploadResults = await Promise.all(
      galleryItems.map(async (item) => {
        const extension = item.file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, item.file);

        if (uploadError) return { error: uploadError };

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        return { url: publicUrlData.publicUrl };
      })
    );

    setUploading(false);

    const failed = uploadResults.find((r) => r.error);
    if (failed?.error) {
      setError("Fotoğraf yüklenirken bir hata oluştu: " + failed.error.message);
      setLoading(false);
      return;
    }

    const imageUrls = uploadResults.map((r) => r.url!);

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

    const { error: imagesError } = await supabase.from("outfit_images").insert(
      imageUrls.map((url, index) => ({
        outfit_id: outfit.id,
        image_url: url,
        position: index,
      }))
    );

    if (imagesError) {
      setError("Ürün görselleri kaydedilirken bir hata oluştu: " + imagesError.message);
      setLoading(false);
      return;
    }

    if (selectedIds.size > 0) {
      const items = [...selectedIds].map((productId) => ({
        outfit_id: outfit.id,
        product_id: productId,
      }));

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

          <ProductGalleryUploader items={galleryItems} onAdd={handleAddFiles} onRemove={handleRemoveItem} />

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Parçaları Seç</p>

            {ownProducts.length === 0 ? (
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
