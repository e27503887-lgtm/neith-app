"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";
import { compressImage, UnsupportedImageError } from "../../utils/compressImage";
import { STYLE_TAGS } from "@/lib/styles";
import ThemeToggle from "../../components/ThemeToggle";
import FieldHint from "../../components/FieldHint";
import DangerZone from "../../components/DangerZone";
import BlockedUsersList from "../../components/BlockedUsersList";
import BodyTypePicker from "../../components/BodyTypePicker";
import SkinTonePicker from "../../components/SkinTonePicker";
import type { BodyType } from "@/lib/bodyType";
import type { SkinUndertone } from "@/lib/skinTone";

const BODY_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;

function validateUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Kullanıcı adı gerekli.";
  if (trimmed.length < 3) return "Kullanıcı adı en az 3 karakter olmalı.";
  if (trimmed.length > 24) return "Kullanıcı adı en fazla 24 karakter olabilir.";
  if (!USERNAME_PATTERN.test(trimmed)) return "Sadece harf, rakam, alt çizgi ve nokta kullan.";
  return null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [bio, setBio] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [allowDms, setAllowDms] = useState(true);

  const [sizeTop, setSizeTop] = useState<string | null>(null);
  const [sizeBottom, setSizeBottom] = useState<string | null>(null);
  const [sizeShoe, setSizeShoe] = useState<number | null>(null);
  const [styleTags, setStyleTags] = useState<string[]>([]);
  // Bu bilgi asla profilde gösterilmez; yalnızca kombin motorunun kendi
  // önerilerini kişiselleştirmesi için kullanılır.
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [skinUndertone, setSkinUndertone] = useState<SkinUndertone | null>(null);
  const [showSizes, setShowSizes] = useState(true);
  const [showWardrobeValue, setShowWardrobeValue] = useState(true);

  const [loading, setLoading] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          "username, bio, avatar_url, banner_url, account_type, allow_dms, size_top, size_bottom, size_shoe, style_tags, show_sizes, show_wardrobe_value, body_type, skin_undertone"
        )
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setUsername(profile.username ?? "");
        setBio(profile.bio ?? "");
        setAccountType(profile.account_type ?? null);
        setAvatarUrl(profile.avatar_url ?? null);
        setBannerUrl(profile.banner_url ?? null);
        setAllowDms(profile.allow_dms ?? true);
        setSizeTop(profile.size_top ?? null);
        setSizeBottom(profile.size_bottom ?? null);
        setSizeShoe(profile.size_shoe ?? null);
        setStyleTags(profile.style_tags ?? []);
        setShowSizes(profile.show_sizes ?? true);
        setShowWardrobeValue(profile.show_wardrobe_value ?? true);
        setBodyType(profile.body_type ?? null);
        setSkinUndertone(profile.skin_undertone ?? null);
      }

      setCheckingAuth(false);
    });
  }, [router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    if (!selected) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }

    setAvatarFile(selected);
    setAvatarPreview(URL.createObjectURL(selected));
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;

    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }

    if (!selected) {
      setBannerFile(null);
      setBannerPreview(null);
      return;
    }

    setBannerFile(selected);
    setBannerPreview(URL.createObjectURL(selected));
  }

  function handleShoeChange(value: string) {
    const parsed = parseInt(value, 10);
    setSizeShoe(Number.isFinite(parsed) ? parsed : null);
  }

  function toggleStyleTag(tag: string) {
    setStyleTags((prev) =>
      prev.includes(tag)
        ? prev.filter((existing) => existing !== tag)
        : prev.length < 4
        ? [...prev, tag]
        : prev
    );
  }

  const usernameError = validateUsername(username);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    if (usernameError) {
      setUsernameTouched(true);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    // Avatar/banner yüklenmeden önce tarayıcıda küçültülüp WebP'ye çevrilir.
    let preparedAvatar: File | null = null;
    let preparedBanner: File | null = null;
    try {
      setPreparing(true);
      [preparedAvatar, preparedBanner] = await Promise.all([
        avatarFile ? compressImage(avatarFile, "avatar") : Promise.resolve(null),
        bannerFile ? compressImage(bannerFile, "banner") : Promise.resolve(null),
      ]);
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

    let newAvatarUrl = avatarUrl;

    if (preparedAvatar) {
      const extension = preparedAvatar.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, preparedAvatar, { upsert: true });

      if (uploadError) {
        setError("Fotoğraf yüklenirken bir hata oluştu: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      newAvatarUrl = publicUrlData.publicUrl;
    }

    let newBannerUrl = bannerUrl;

    if (preparedBanner) {
      const extension = preparedBanner.name.split(".").pop() || "jpg";
      const path = `${user.id}/banner.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, preparedBanner, { upsert: true });

      if (uploadError) {
        setError("Banner yüklenirken bir hata oluştu: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);

      newBannerUrl = publicUrlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        avatar_url: newAvatarUrl,
        allow_dms: allowDms,
        ...(accountType === "brand" ? { banner_url: newBannerUrl } : {}),
        size_top: sizeTop,
        size_bottom: sizeBottom,
        size_shoe: sizeShoe,
        style_tags: styleTags,
        show_sizes: showSizes,
        show_wardrobe_value: showWardrobeValue,
        body_type: bodyType,
        skin_undertone: skinUndertone,
      })
      .eq("id", user.id);

    setLoading(false);

    if (updateError) {
      if (updateError.code === "23505") {
        setError("Bu kullanıcı adı alınmış.");
      } else {
        setError("Profil güncellenirken bir hata oluştu: " + updateError.message);
      }
      return;
    }

    setSuccess(true);
    router.push(`/profile/${username}`);
    router.refresh();
  }

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6">
      <div className="max-w-md mx-auto bg-paper p-8 rounded-xl shadow-sm border border-neutral-200">
        <h1 className="text-xl font-bold mb-6">Profili Düzenle</h1>

        <div className="mb-6 pb-6 border-b border-neutral-200">
          <ThemeToggle />
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm mb-4">Profil güncellendi!</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            {avatarPreview || avatarUrl ? (
              <Image
                src={avatarPreview ?? avatarUrl ?? ""}
                alt="Avatar önizleme"
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
                {username?.[0]?.toUpperCase()}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="flex-1 text-sm"
            />
          </div>

          {accountType === "brand" && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Banner Fotoğrafı</p>
              <div className="relative w-full aspect-[16/5] bg-neutral-100 border border-neutral-200 overflow-hidden">
                {bannerPreview || bannerUrl ? (
                  <Image
                    src={bannerPreview ?? bannerUrl ?? ""}
                    alt="Banner önizleme"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-wide text-neutral-500">
                    Banner yok
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="mt-2 w-full text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Önerilen oran: 16:5 (geniş dikdörtgen).</p>
            </div>
          )}

          <div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setUsernameTouched(true)}
              placeholder="Kullanıcı Adı"
              className="w-full p-3 border rounded-md"
              required
            />
            <FieldHint
              error={usernameTouched ? usernameError : null}
              valid={usernameTouched && !usernameError}
            />
          </div>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio"
            rows={4}
            className="w-full p-3 border rounded-md resize-none"
          />

          <div className="pt-4 border-t border-neutral-200">
            <h3 className="section-label mb-2">Beden & Stil</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-gray-700">Üst Beden</span>
                <select
                  value={sizeTop ?? ""}
                  onChange={(e) => setSizeTop(e.target.value || null)}
                  className="mt-2 w-full p-3 border rounded-md"
                >
                  <option value="">Seçin</option>
                  {BODY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm text-gray-700">Alt Beden</span>
                <select
                  value={sizeBottom ?? ""}
                  onChange={(e) => setSizeBottom(e.target.value || null)}
                  className="mt-2 w-full p-3 border rounded-md"
                >
                  <option value="">Seçin</option>
                  {BODY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm text-gray-700">Ayakkabı Numarası</span>
                <input
                  value={sizeShoe ?? ""}
                  onChange={(e) => handleShoeChange(e.target.value)}
                  type="number"
                  min={30}
                  max={50}
                  placeholder="30 - 50"
                  className="mt-2 w-full p-3 border rounded-md"
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Stil Etiketleri</p>
              <div className="flex flex-wrap gap-2">
                {STYLE_TAGS.map((tag) => {
                  const selected = styleTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleStyleTag(tag)}
                      className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                        selected
                          ? "bg-primary text-dark border-primary"
                          : "border-neutral-300 text-gray-600 hover:border-primary hover:text-ink"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                En fazla 4 stil etiketi seçebilirsiniz.
              </p>
            </div>

            <div className="mt-4 border border-neutral-200 p-4 space-y-4">
              <BodyTypePicker value={bodyType} onChange={setBodyType} />
              <div className="border-t border-neutral-200 pt-4">
                <SkinTonePicker value={skinUndertone} onChange={setSkinUndertone} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-ink">Beden ve stil bilgilerini göster</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Profilde küçük ve şık şekilde gösterilir.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showSizes}
                onClick={() => setShowSizes((prev) => !prev)}
                className="relative p-2.5 -m-2.5 shrink-0"
              >
                <span
                  className={`relative block w-11 h-6 rounded-full transition-colors ${
                    showSizes ? "bg-accent" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper rounded-full transition-transform ${
                      showSizes ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <h3 className="section-label mb-2">Gizlilik</h3>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-ink">Gardırop değerini göster</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Satıştaki ürünlerinin toplam değeri profilinde görünür.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showWardrobeValue}
                onClick={() => setShowWardrobeValue((prev) => !prev)}
                className="relative p-2.5 -m-2.5 shrink-0"
              >
                <span
                  className={`relative block w-11 h-6 rounded-full transition-colors ${
                    showWardrobeValue ? "bg-accent" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper rounded-full transition-transform ${
                      showWardrobeValue ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-ink">Kimler bana mesaj gönderebilir?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {allowDms ? "Herkes" : "Hiç kimse (mevcut sohbetlerim devam eder)"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowDms}
                onClick={() => setAllowDms((prev) => !prev)}
                className="relative p-2.5 -m-2.5 shrink-0"
              >
                <span
                  className={`relative block w-11 h-6 rounded-full transition-colors ${
                    allowDms ? "bg-accent" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper rounded-full transition-transform ${
                      allowDms ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <button disabled={loading} className="btn-primary w-full">
            {preparing ? "Fotoğraf hazırlanıyor..." : loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>

        <BlockedUsersList />

        <DangerZone username={username} />
      </div>
    </main>
  );
}
