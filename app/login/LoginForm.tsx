"use client";

import { useState, useEffect } from "react";
import { supabase } from "../utils/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { consumePendingInviteCode } from "@/lib/invites";
import FieldHint from "../components/FieldHint";
import Link from "next/link";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

function validateEmail(value: string): string | null {
  if (!value.trim()) return "E-posta gerekli.";
  if (!EMAIL_PATTERN.test(value)) return "Geçerli bir e-posta adresi gir.";
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) return "Şifre gerekli.";
  if (value.length < MIN_PASSWORD) return `Şifre en az ${MIN_PASSWORD} karakter olmalı.`;
  return null;
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      setOauthError("Google ile giriş başarısız oldu, tekrar dene.");
    }
  }, [searchParams]);

  async function handleAuth(type: "signup" | "signin") {
    // Toplu hata mesajı yerine alan bazlı geri bildirim: geçersizse ilgili
    // alanların uyarıları görünür kılınır, gönderim yapılmaz.
    if (emailError || passwordError) {
      setTouched({ email: true, password: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    if (type === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ text: "Kayıt başarısız: " + error.message, type: "error" });
      } else {
        setMessage({
          text: "Kayıt başarılı! E-postana gelen doğrulama bağlantısına tıkla, sonra giriş yap.",
          type: "success",
        });
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ text: "Giriş başarısız: E-posta veya şifre hatalı.", type: "error" });
      } else {
        if (data.user) {
          const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();

          if (!existingProfile) {
            const username = data.user.email?.split("@")[0] ?? `user_${data.user.id.slice(0, 8)}`;
            await supabase
              .from("profiles")
              .insert([{ id: data.user.id, username, bio: "", avatar_url: null }]);
            await consumePendingInviteCode(data.user.id);
          }
        }

        router.push("/");
        router.refresh();
      }
    }

    setLoading(false);
  }

  async function handlePasswordReset() {
    if (emailError) {
      setTouched((t) => ({ ...t, email: true }));
      return;
    }

    setLoading(true);
    setMessage(null);

    // Hesap varlığını sızdırmamak için sonuç ne olursa olsun aynı mesaj.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setResetSent(true);
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage(null);
    setOauthError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setOauthError("Google ile giriş başarısız oldu, tekrar dene.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper">
      <div className="bg-paper p-8 rounded-xl shadow-sm border border-neutral-200 w-96 space-y-4">
        <h1 className="text-xl font-serif font-bold">Neith&apos;e Hoş Geldin</h1>

        {oauthError && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
            {oauthError}
          </p>
        )}

        <div>
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            className="w-full p-3 border rounded-md"
          />
          <FieldHint error={touched.email ? emailError : null} valid={touched.email && !emailError} />
        </div>
        {!resetMode && (
          <div>
            <input
              type="password"
              placeholder="Şifre"
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
        )}

        {resetMode && resetSent && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Sıfırlama bağlantısı e-postana gönderildi.
          </p>
        )}

        {message && (
          <p
            className={`text-sm ${
              message.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {message.text}
          </p>
        )}

        {resetMode ? (
          <div className="flex flex-col items-center gap-3 pt-1">
            <button onClick={handlePasswordReset} disabled={loading} className="btn-primary w-full">
              {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
            </button>
            <button
              onClick={() => {
                setResetMode(false);
                setResetSent(false);
              }}
              className="btn-secondary"
            >
              ← Girişe dön
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-1">
            <button
              onClick={() => handleAuth("signin")}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Bekleyin..." : "Giriş Yap"}
            </button>
            <button
              onClick={() => handleAuth("signup")}
              disabled={loading}
              className="btn-secondary disabled:opacity-50"
            >
              Hesabın yok mu? Kayıt Ol
            </button>
            <button
              onClick={() => {
                setResetMode(true);
                setMessage(null);
              }}
              className="text-xs text-gray-500 hover:text-accent transition-colors"
            >
              Şifreni mi unuttun?
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-neutral-300"></div>
          <span className="text-xs text-neutral-500 font-light">veya</span>
          <div className="flex-1 h-px bg-neutral-300"></div>
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full p-3 bg-white border border-neutral-300 rounded-md flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors disabled:opacity-50"
        >
          {/* Google G Logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm font-medium text-neutral-700">Google ile Devam Et</span>
        </button>

        <p className="text-center text-[11px] text-gray-500 leading-relaxed">
          Kayıt olarak{" "}
          <Link href="/legal/kullanim-kosullari" className="underline hover:text-accent">
            Kullanım Koşulları
          </Link>
          &apos;nı ve{" "}
          <Link href="/legal/kvkk" className="underline hover:text-accent">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni kabul etmiş olursun.
        </p>
      </div>
    </main>
  );
}
