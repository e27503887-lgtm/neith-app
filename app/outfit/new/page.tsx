"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";

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

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("Fotoğraf 5MB'dan büyük olamaz.");
      e.target.value = "";
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    setError("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user || !file) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.target);
    const title = formData.get("title");
    const description = formData.get("description");

    setUploading(true);

    const extension = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file);

    setUploading(false);

    if (uploadError) {
      setError("Fotoğraf yüklenirken bir hata oluştu: " + uploadError.message);
      setLoading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    const { data: outfit, error: insertError } = await supabase
      .from("outfits")
      .insert([
        {
          user_id: user.id,
          title,
          description,
          image_url: publicUrlData.publicUrl,
        },
      ])
      .select("id")
      .single();

    if (insertError || !outfit) {
      setError("Kombin paylaşılırken bir hata oluştu: " + insertError?.message);
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
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-3 border rounded-md"
            required
          />

          {previewUrl && (
            <Image
              src={previewUrl}
              alt="Önizleme"
              width={96}
              height={96}
              className="w-24 h-24 object-cover rounded-md border border-neutral-200"
            />
          )}

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
            {uploading ? "Fotoğraf yükleniyor..." : loading ? "Paylaşılıyor..." : "Kombini Paylaş"}
          </button>
        </form>
      </div>
    </main>
  );
}
