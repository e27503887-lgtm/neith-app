"use client";

// Profil ayarlarının en altındaki "Tehlikeli Bölge": hesap silme.
// Kullanıcı adını yazarak onaylanır; işlem geri alınamaz. Silme sunucu
// tarafındaki /api/delete-account route'unda service role ile yapılır.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export default function DangerZone({ username }: { username: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Sunucuda SUPABASE_SERVICE_ROLE_KEY tanımlı değilse buton devre dışı
  // kalır; anahtar eklenince kod değişikliği olmadan çalışır hale gelir.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/delete-account")
      .then((res) => res.json())
      .then((json) => {
        if (active) setEnabled(!!json.enabled);
      })
      .catch(() => {
        if (active) setEnabled(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirmed = confirmText.trim() === username;

  async function handleDelete() {
    if (!confirmed || busy) return;

    setBusy(true);
    setError("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Oturum bulunamadı — yeniden giriş yap.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Hesap silinirken bir hata oluştu.");
        setBusy(false);
        return;
      }
    } catch {
      setError("Hesap silinirken bir hata oluştu.");
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6">
      <p className="text-xs uppercase tracking-[0.2em] text-accent mb-3">Tehlikeli Bölge</p>

      {enabled === false ? (
        <div>
          <button
            type="button"
            disabled
            className="text-sm text-gray-500 underline underline-offset-4 decoration-neutral-300 opacity-60 cursor-not-allowed"
          >
            Hesabımı Sil
          </button>
          <p className="text-xs text-gray-500 mt-1.5">Bu özellik yakında aktif olacak.</p>
        </div>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={enabled === null}
          className="text-sm text-gray-600 underline underline-offset-4 decoration-neutral-400 hover:text-accent transition-colors disabled:opacity-60"
        >
          Hesabımı Sil
        </button>
      ) : (
        <div className="border border-accent/40 p-4 space-y-3">
          <p className="text-sm text-ink font-medium">Bu işlem geri alınamaz.</p>
          <p className="text-sm text-gray-600 leading-6">
            Hesabın, ilanların, kombinlerin, gönderilerin ve mesajların kalıcı olarak silinir.
            Devam etmek için kullanıcı adını (<span className="font-medium">{username}</span>)
            yaz.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Kullanıcı adın"
            className="w-full p-3 border border-neutral-300 bg-surface text-sm"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!confirmed || busy}
              className="bg-primary text-dark text-xs uppercase tracking-widest font-medium px-5 py-2.5 transition-colors hover:bg-accent disabled:opacity-40 disabled:pointer-events-none"
            >
              {busy ? "Siliniyor..." : "Hesabımı Kalıcı Olarak Sil"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError("");
              }}
              className="text-xs uppercase tracking-wide text-gray-500 hover:text-ink transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
