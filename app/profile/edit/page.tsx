"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../utils/supabase";

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [accountType, setAccountType] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [allowDms, setAllowDms] = useState(true);

  const [loading, setLoading] = useState(false);
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
        .select("username, bio, avatar_url, banner_url, account_type, allow_dms")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setUsername(profile.username ?? "");
        setBio(profile.bio ?? "");
        setAccountType(profile.account_type ?? null);
        setAvatarUrl(profile.avatar_url ?? null);
        setBannerUrl(profile.banner_url ?? null);
        setAllowDms(profile.allow_dms ?? true);
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

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const extension = avatarFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

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

    if (bannerFile) {
      const extension = bannerFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/banner.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, bannerFile, { upsert: true });

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
                  <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-wide text-neutral-400">
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
              <p className="text-xs text-gray-400 mt-1">Önerilen oran: 16:5 (geniş dikdörtgen).</p>
            </div>
          )}

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı Adı"
            className="w-full p-3 border rounded-md"
            required
          />

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio"
            rows={4}
            className="w-full p-3 border rounded-md resize-none"
          />

          <div className="pt-4 border-t border-neutral-200">
            <h3 className="section-label mb-2">Gizlilik</h3>
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
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
