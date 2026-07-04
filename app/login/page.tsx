"use client";

import { useState } from "react";
import { supabase } from "../utils/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const router = useRouter();

  async function handleAuth(type: "signup" | "signin") {
    if (!email || !password) {
      setMessage({ text: "E-posta ve şifre alanlarını doldurun.", type: "error" });
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
          }
        }

        router.push("/");
        router.refresh();
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 w-96 space-y-4">
        <h1 className="text-xl font-bold">Neith&apos;e Hoş Geldin</h1>

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-md"
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-md"
        />

        {message && (
          <p
            className={`text-sm ${
              message.type === "error" ? "text-red-600" : "text-green-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => handleAuth("signin")}
            disabled={loading}
            className="flex-1 bg-black text-white py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Bekleyin..." : "Giriş Yap"}
          </button>
          <button
            onClick={() => handleAuth("signup")}
            disabled={loading}
            className="flex-1 border py-2 rounded-md disabled:opacity-50"
          >
            Kayıt Ol
          </button>
        </div>
      </div>
    </main>
  );
}
