"use client";

// Şifre sıfırlama: e-postadaki bağlantı buraya düşer (Supabase recovery
// oturumu açar). Yeni şifre + tekrar → updateUser, başarıda /login.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import FieldHint from "../../components/FieldHint";

const MIN_PASSWORD = 6;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordError = !password
    ? "Yeni şifre gerekli."
    : password.length < MIN_PASSWORD
      ? `Şifre en az ${MIN_PASSWORD} karakter olmalı.`
      : null;
  const confirmError = !confirm
    ? "Şifreni tekrar gir."
    : confirm !== password
      ? "Şifreler eşleşmiyor."
      : null;

  async function handleSubmit() {
    if (passwordError || confirmError) {
      setTouched({ password: true, confirm: true });
      return;
    }

    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir — yeni bir sıfırlama bağlantısı iste."
      );
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="bg-surface p-8 border border-neutral-200 w-full max-w-sm space-y-4">
        <div>
          <p className="section-label mb-2">Hesap Güvenliği</p>
          <h1 className="font-serif text-2xl text-ink">Yeni Şifre Belirle</h1>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div>
          <input
            type="password"
            placeholder="Yeni şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            className="w-full p-3 border rounded-md"
          />
          <FieldHint
            error={touched.password ? passwordError : null}
            valid={touched.password && !passwordError}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Yeni şifre (tekrar)"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            className="w-full p-3 border rounded-md"
          />
          <FieldHint
            error={touched.confirm ? confirmError : null}
            valid={touched.confirm && !confirmError}
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full">
          {loading ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </button>
      </div>
    </main>
  );
}
