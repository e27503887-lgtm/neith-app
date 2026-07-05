"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Heart, Mail, ChevronDown } from "lucide-react";
import { supabase } from "./utils/supabase";
import NotificationBell from "./components/NotificationBell";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="text-2xl font-serif tracking-wide">
          Neith
        </Link>

        {/* Explore dropdown */}
        <div className="relative">
          <button
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-ink px-3 py-1 rounded"
            aria-label="Keşfet"
          >
            Keşfet
            <ChevronDown size={14} className="text-gray-500" />
          </button>

          {open && (
            <div className="absolute left-0 mt-2 w-56 bg-paper border border-neutral-200 rounded shadow-lg z-50" role="menu" aria-label="Keşfet menüsü">
              <nav className="flex flex-col py-2" role="menu">
                <Link href="/era" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dönemler</Link>
                <Link href="/fashion-week" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Moda Haftası</Link>
                <Link href="/#recommendations" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Kombin Önerileri</Link>
                <Link href="/live" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Canlı Akış</Link>
                <Link href="/#feed" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Sosyal Akış</Link>
                <Link href="/brands" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Marka Vitrini</Link>
                <Link href="/editorial" role="menuitem" className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Moda Dergisi</Link>
              </nav>
            </div>
          )}
        </div>
      </div>

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
      </div>

      <div className="flex items-center gap-5 text-sm ml-auto">
        <Link href="/intelligence" className="hover:text-accent transition-colors">
          Stil Asistanı
        </Link>

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
