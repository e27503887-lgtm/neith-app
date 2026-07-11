"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "../utils/supabase";
import { compressImage, UnsupportedImageError } from "../utils/compressImage";
import {
  COMPOSE_POST_OPEN_EVENT,
  POST_CREATED_EVENT,
  type CreatedPost,
} from "../utils/composeEvents";

const MAX_PHOTOS = 6;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_CHARS = 2000;

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

async function uploadPhoto(userId: string, file: File, index: number) {
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
  if (uploadError) return { error: uploadError };

  const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(path);
  return { url: publicUrlData.publicUrl };
}

export default function ComposePostModal({ initialOpen = false }: { initialOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }

    window.addEventListener(COMPOSE_POST_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(COMPOSE_POST_OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!open) return;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setOpen(false);
        router.push("/login");
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("username, avatar_url, account_type")
        .eq("id", data.user.id)
        .maybeSingle();

      setProfile({
        id: data.user.id,
        username: row?.username ?? "",
        avatar_url: row?.avatar_url ?? null,
        account_type: row?.account_type ?? null,
      });
    });

    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 250);
    return () => window.clearTimeout(focusTimer);
  }, [open, router]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    setError("");

    const accepted: PhotoItem[] = [];
    let remaining = MAX_PHOTOS - photos.length;

    for (const file of files) {
      if (remaining <= 0) {
        setError(`En fazla ${MAX_PHOTOS} fotoğraf ekleyebilirsin.`);
        break;
      }
      if (!file.type.startsWith("image")) {
        setError("Sadece fotoğraf ekleyebilirsin.");
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        setError("Her fotoğraf 8MB'dan küçük olmalı.");
        continue;
      }

      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
      remaining -= 1;
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }
  }

  function handleRemovePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function resetForm() {
    setText("");
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setError("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const canSubmit = !submitting && (text.trim().length > 0 || photos.length > 0);

  async function handleSubmit() {
    if (!canSubmit || !profile) return;

    setSubmitting(true);
    setError("");

    // Ham fotoğrafları (3-8MB) yüklemeden önce tarayıcıda küçült + WebP'ye çevir.
    let prepared: File[];
    try {
      setPreparing(true);
      prepared = await Promise.all(photos.map((photo) => compressImage(photo.file, "main")));
    } catch (err) {
      setError(
        err instanceof UnsupportedImageError
          ? err.message
          : "Fotoğraf hazırlanırken bir hata oluştu."
      );
      setPreparing(false);
      setSubmitting(false);
      return;
    }
    setPreparing(false);

    const uploadResults = await Promise.all(
      prepared.map((file, i) => uploadPhoto(profile.id, file, i))
    );

    const failed = uploadResults.find((r) => r.error);
    if (failed?.error) {
      setError("Fotoğraflar yüklenirken bir hata oluştu: " + failed.error.message);
      setSubmitting(false);
      return;
    }

    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert([{ user_id: profile.id, caption: text.trim() || null }])
      .select("id, caption, created_at")
      .single();

    if (insertError || !post) {
      setError("Gönderi paylaşılırken bir hata oluştu: " + insertError?.message);
      setSubmitting(false);
      return;
    }

    if (photos.length > 0) {
      const mediaRows = photos.map((_, index) => ({
        post_id: post.id,
        media_url: uploadResults[index].url!,
        media_type: "image",
        position: index,
      }));

      const { error: mediaError } = await supabase.from("post_media").insert(mediaRows);
      if (mediaError) {
        setError("Fotoğraflar kaydedilirken bir hata oluştu: " + mediaError.message);
        setSubmitting(false);
        return;
      }
    }

    const createdPost: CreatedPost = {
      id: post.id,
      user_id: profile.id,
      caption: post.caption,
      created_at: post.created_at,
      cover_url: uploadResults[0]?.url ?? "",
      cover_type: "image",
      media: uploadResults.map((r) => ({ url: r.url!, type: "image" as const })),
      media_count: photos.length,
      like_count: 0,
      username: profile.username,
      avatar_url: profile.avatar_url,
      account_type: profile.account_type,
    };

    window.dispatchEvent(new CustomEvent<CreatedPost>(POST_CREATED_EVENT, { detail: createdPost }));

    setSubmitting(false);
    resetForm();
    setOpen(false);

    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2500);
  }

  const composeBody = (
    <>
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Kapat"
          className="text-gray-500 hover:text-ink transition-colors"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        <span className="text-xs uppercase tracking-[0.24em] text-gray-500">Gönderi Paylaş</span>
        <span className="w-5" aria-hidden />
      </div>

      <div className="flex gap-4 px-5 pt-5">
        <div className="shrink-0">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
              {profile?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={text}
            maxLength={MAX_CHARS}
            onChange={(e) => {
              setText(e.target.value);
              autoGrow();
            }}
            placeholder="Bugün ne giydin?"
            rows={3}
            className="w-full resize-none overflow-hidden bg-transparent text-lg leading-relaxed text-ink placeholder:text-gray-500 focus:outline-none"
          />

          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt="Fotoğraf önizleme"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    aria-label="Fotoğrafı kaldır"
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="px-5 pt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-neutral-200 px-5 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            aria-label="Fotoğraf ekle"
            className="text-accent hover:text-ink transition-colors disabled:text-gray-300"
          >
            <ImagePlus size={20} strokeWidth={1.5} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddFiles}
            className="hidden"
          />
          <span className={`text-xs ${text.length >= MAX_CHARS ? "text-accent" : "text-gray-500"}`}>
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {preparing ? "Fotoğraf hazırlanıyor..." : submitting ? "Paylaşılıyor..." : "Paylaş"}
        </button>
      </div>
    </>
  );

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />

            {/* Desktop: centered card */}
            <motion.div
              className="hidden md:block absolute left-1/2 top-24 w-full max-w-lg -translate-x-1/2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Gönderi paylaş"
                className="bg-surface border border-neutral-200 rounded-2xl shadow-xl overflow-hidden"
              >
                {composeBody}
              </div>
            </motion.div>

            {/* Mobile: bottom sheet */}
            <motion.div
              className="md:hidden absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Gönderi paylaş"
                className="bg-paper border-t border-neutral-200 rounded-t-2xl pb-[env(safe-area-inset-bottom)]"
              >
                <div className="flex justify-center pt-2">
                  <span className="h-1 w-10 rounded-full bg-neutral-300" />
                </div>
                {composeBody}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toastVisible && (
          <motion.div
            className="fixed bottom-20 md:bottom-8 left-1/2 z-[90] -translate-x-1/2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <span className="block whitespace-nowrap rounded-full bg-ink text-white text-sm px-5 py-2.5 shadow-lg">
              Gönderin paylaşıldı ✓
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
