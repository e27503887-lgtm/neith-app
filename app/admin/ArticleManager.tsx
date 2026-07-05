"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import { ARTICLE_CATEGORIES, getArticleCategoryLabel } from "@/lib/articleCategories";

type Article = {
  id: number | string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  category: string | null;
  published: boolean;
  created_at: string;
};

const TURKISH_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type FormState = {
  id: number | string | null;
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  content: string;
  category: string;
  coverImageUrl: string | null;
  coverFile: File | null;
  coverPreview: string | null;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content: "",
  category: ARTICLE_CATEGORIES[0].value,
  coverImageUrl: null,
  coverFile: null,
  coverPreview: null,
};

export default function ArticleManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase.from("articles").select("*").order("created_at", { ascending: false });
    setArticles(data ?? []);
    setLoading(false);
  }

  function openNewForm() {
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  function openEditForm(article: Article) {
    setForm({
      id: article.id,
      title: article.title,
      slug: article.slug,
      slugTouched: true,
      excerpt: article.excerpt ?? "",
      content: article.content ?? "",
      category: article.category ?? ARTICLE_CATEGORIES[0].value,
      coverImageUrl: article.cover_image_url,
      coverFile: null,
      coverPreview: null,
    });
    setError("");
  }

  function closeForm() {
    if (form?.coverPreview) URL.revokeObjectURL(form.coverPreview);
    setForm(null);
    setError("");
  }

  function handleTitleChange(value: string) {
    setForm((prev) =>
      prev ? { ...prev, title: value, slug: prev.slugTouched ? prev.slug : slugify(value) } : prev
    );
  }

  function handleSlugChange(value: string) {
    setForm((prev) => (prev ? { ...prev, slug: value, slugTouched: true } : prev));
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;

    setForm((prev) => {
      if (!prev) return prev;
      if (prev.coverPreview) URL.revokeObjectURL(prev.coverPreview);
      return { ...prev, coverFile: file, coverPreview: URL.createObjectURL(file) };
    });
  }

  async function handleSave(publish: boolean) {
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Başlık ve slug zorunludur.");
      return;
    }

    setSaving(true);
    setError("");

    let coverImageUrl = form.coverImageUrl;

    if (form.coverFile) {
      const extension = form.coverFile.name.split(".").pop() || "jpg";
      const path = `articles/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, form.coverFile);

      if (uploadError) {
        setError("Kapak görseli yüklenirken bir hata oluştu: " + uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
      coverImageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim() || null,
      content: form.content,
      category: form.category,
      cover_image_url: coverImageUrl,
      published: publish,
    };

    const { error: saveError } =
      form.id === null
        ? await supabase.from("articles").insert([payload])
        : await supabase.from("articles").update(payload).eq("id", form.id);

    setSaving(false);

    if (saveError) {
      setError("Makale kaydedilirken bir hata oluştu: " + saveError.message);
      return;
    }

    closeForm();
    loadArticles();
  }

  async function handleDelete(article: Article) {
    if (!window.confirm(`"${article.title}" makalesini silmek istediğine emin misin?`)) return;

    const key = String(article.id);
    setBusyIds((prev) => new Set(prev).add(key));
    const { error: deleteError } = await supabase.from("articles").delete().eq("id", article.id);
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    if (deleteError) {
      window.alert("Makale silinirken bir hata oluştu: " + deleteError.message);
      return;
    }

    setArticles((prev) => prev.filter((a) => a.id !== article.id));
  }

  if (form) {
    return (
      <div className="border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-ink">
            {form.id === null ? "Yeni Makale" : "Makaleyi Düzenle"}
          </h2>
          <button
            onClick={closeForm}
            className="text-xs uppercase tracking-wide text-gray-500 hover:text-ink transition-colors"
          >
            Vazgeç
          </button>
        </div>

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="space-y-4">
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Başlık"
            className="w-full p-3 border border-neutral-200 text-sm focus:outline-none focus:border-ink transition-colors"
          />
          <input
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="slug"
            className="w-full p-3 border border-neutral-200 text-sm font-mono focus:outline-none focus:border-ink transition-colors"
          />
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, excerpt: e.target.value } : prev))}
            placeholder="Özet"
            rows={2}
            className="w-full p-3 border border-neutral-200 text-sm resize-none focus:outline-none focus:border-ink transition-colors"
          />
          <textarea
            value={form.content}
            onChange={(e) => setForm((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
            placeholder="İçerik"
            rows={10}
            className="w-full p-3 border border-neutral-200 text-sm resize-none focus:outline-none focus:border-ink transition-colors"
          />

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Kategori</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
              className="border border-neutral-200 bg-paper text-sm px-3 py-2 focus:outline-none focus:border-ink transition-colors"
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-1.5">Kapak Görseli</label>
            {(form.coverPreview || form.coverImageUrl) && (
              <div className="relative w-full max-w-xs aspect-[16/9] mb-2 bg-neutral-100 overflow-hidden">
                <Image
                  src={form.coverPreview ?? form.coverImageUrl ?? ""}
                  alt="Kapak önizleme"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleCoverChange} className="text-sm" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="text-xs uppercase tracking-wide text-gray-600 border border-neutral-300 px-6 py-3 hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Taslak Kaydet"}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Yayınla"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openNewForm} className="btn-primary">
          Yeni Makale
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : (
        <div className="border border-neutral-200 divide-y divide-neutral-200">
          {articles.length === 0 && <p className="p-6 text-sm text-gray-500">Henüz makale yok.</p>}
          {articles.map((article) => (
            <div key={article.id} className="flex items-center gap-4 p-3">
              <div className="relative w-12 h-12 shrink-0 bg-gray-100 overflow-hidden">
                {article.cover_image_url && (
                  <Image
                    src={article.cover_image_url}
                    alt={article.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink truncate">{article.title}</p>
                <p className="text-xs text-gray-500">
                  {getArticleCategoryLabel(article.category)} ·{" "}
                  {new Date(article.created_at).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wide px-2 py-0.5 shrink-0 border ${
                  article.published ? "border-green-600 text-green-600" : "border-neutral-300 text-gray-500"
                }`}
              >
                {article.published ? "Yayında" : "Taslak"}
              </span>
              <button
                onClick={() => openEditForm(article)}
                className="text-xs uppercase tracking-wide text-gray-500 border border-neutral-300 px-3 py-1.5 hover:border-ink hover:text-ink transition-colors shrink-0"
              >
                Düzenle
              </button>
              <button
                onClick={() => handleDelete(article)}
                disabled={busyIds.has(String(article.id))}
                className="text-xs uppercase tracking-wide text-accent border border-accent px-3 py-1.5 hover:bg-accent hover:text-paper transition-colors disabled:opacity-50 shrink-0"
              >
                {busyIds.has(String(article.id)) ? "Siliniyor..." : "Sil"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
