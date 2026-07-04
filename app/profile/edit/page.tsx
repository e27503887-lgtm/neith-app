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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

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
        .select("username, bio, avatar_url")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setUsername(profile.username ?? "");
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
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

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ username, bio, avatar_url: newAvatarUrl })
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
    <main className="min-h-screen bg-[#FAFAFA] pt-24 px-6">
      <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
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
                className="w-16 h-16 rounded-full object-cover border border-gray-100"
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

          <button
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-md font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </main>
  );
}
