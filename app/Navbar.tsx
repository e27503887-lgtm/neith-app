"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "./utils/supabase";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Sayfa ilk yüklendiğinde mevcut oturumu al
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    // Giriş / çıkış olaylarını dinle, Navbar otomatik güncellensin
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="fixed w-full z-40 flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
      <Link href="/" className="text-xl font-bold tracking-tight">
        Neith
      </Link>

      <div className="flex items-center gap-4 text-sm">
        <Link href="/sell" className="hover:text-gray-600">
          İlan Ver
        </Link>

        {user ? (
          <>
            <span className="text-gray-500">{user.email}</span>
            <button
              onClick={handleLogout}
              className="border px-4 py-1.5 rounded-md hover:bg-gray-50"
            >
              Çıkış
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="bg-black text-white px-4 py-1.5 rounded-md hover:bg-gray-800"
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </nav>
  );
}
