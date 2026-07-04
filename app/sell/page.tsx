"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function SellPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const price = formData.get("price");
    const username = user.email?.split("@")[0] ?? "";

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

    // RLS: auth.uid() = user_id şartını sağlamak için giriş yapan kullanıcının id'sini ekliyoruz
    const { error: insertError } = await supabase.from("products").insert([
      {
        title,
        price,
        image_url: publicUrlData.publicUrl,
        username,
        user_id: user.id,
      },
    ]);

    setLoading(false);

    if (insertError) {
      setError("İlan yayınlanırken bir hata oluştu: " + insertError.message);
      return;
    }

    setSuccess(true);
    e.target.reset();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 px-6">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex gap-6 border-b border-gray-100 mb-6">
          <span className="pb-3 -mb-px border-b-2 border-black text-sm font-medium text-gray-900">
            Ürün
          </span>
          <Link href="/outfit/new" className="pb-3 -mb-px border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700">
            Kombin
          </Link>
        </div>

        <h1 className="text-xl font-bold mb-6">Yeni İlan Ekle</h1>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-4">İlanınız yayınlandı!</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="title" placeholder="Ürün Başlığı" className="w-full p-3 border rounded-md" required />
          <input name="price" type="number" placeholder="Fiyat (TL)" className="w-full p-3 border rounded-md" required />
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
              className="w-24 h-24 object-cover rounded-md border border-gray-100"
            />
          )}

          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {uploading ? "Fotoğraf yükleniyor..." : loading ? "Ekleniyor..." : "İlanı Yayınla"}
          </button>
        </form>
      </div>
    </main>
  );
}
