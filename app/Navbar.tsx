"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Heart, Mail } from "lucide-react";
import { supabase } from "./utils/supabase";
import NotificationBell from "./components/NotificationBell";
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
    <nav className="fixed w-full z-40 flex items-center gap-4 px-8 py-5 bg-paper border-b border-neutral-200">
      <Link href="/" className="text-2xl font-serif tracking-wide shrink-0">
        Neith
      </Link>

      <div className="hidden md:flex flex-1 items-center justify-center gap-4 px-8">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            strokeWidth={1.5}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-ink transition-colors"
          />
        </div>
        <Link
          href="/era"
          className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors whitespace-nowrap"
        >
          Dönemler
        </Link>
      </div>

      <div className="flex items-center gap-5 text-sm ml-auto">
        <Link href="/sell" className="hover:text-accent transition-colors">
          İlan Ver
        </Link>

        <Link href="/favorites">
          <Heart size={19} strokeWidth={1.5} className="text-gray-500 hover:text-accent transition-colors" />
        </Link>
        <Link href="/messages">
          <Mail size={19} strokeWidth={1.5} className="text-gray-500 hover:text-accent transition-colors" />
        </Link>
        <NotificationBell />

        {user ? (
          <>
            <span className="text-gray-500 text-xs">{user.email}</span>
            <button
              onClick={handleLogout}
              className="border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
            >
              Çıkış
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
          >
            Giriş Yap
          </Link>
        )}
      </div>
    </nav>
  );
}
