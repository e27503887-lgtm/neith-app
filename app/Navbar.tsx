"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Heart, Mail, Bell } from "lucide-react";
import { supabase } from "./utils/supabase";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
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

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <nav className="fixed w-full z-40 flex items-center gap-4 px-8 py-4 bg-white border-b border-gray-100">
      <Link href="/" className="text-xl font-serif tracking-tight shrink-0">
        Neith
      </Link>

      <div className="hidden md:flex flex-1 justify-center px-8">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-gray-50 border border-gray-100 rounded-full pl-9 pr-4 py-2 text-sm text-gray-700 focus:outline-none focus:border-gray-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm ml-auto">
        <Link href="/sell" className="hover:text-gray-600">
          İlan Ver
        </Link>

        <Link href="/favorites">
          <Heart size={20} className="text-gray-500 hover:text-gray-700" />
        </Link>
        <Link href="/messages">
          <Mail size={20} className="text-gray-500 hover:text-gray-700" />
        </Link>
        <Bell size={20} className="text-gray-500" />

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
