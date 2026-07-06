"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Search, Heart, Mail, ChevronDown, X, User as UserIcon } from "lucide-react";
import { supabase } from "./utils/supabase";
import NotificationBell from "./components/NotificationBell";
import MobileMessagesPanel from "./components/MobileMessagesPanel";
import type { User } from "@supabase/supabase-js";

type Profile = { username: string; avatar_url: string | null };

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", uid)
        .maybeSingle();
      if (active) setProfile(data ?? null);
    }

    // Sayfa ilk yüklendiğinde mevcut oturumu al
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) loadProfile(data.user.id);
    });

    // Giriş / çıkış olaylarını dinle, Navbar otomatik güncellensin
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMounted(true);
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
    setMobileSearchOpen(false);
  }

  return (
    <nav className="fixed w-full z-40 flex items-center gap-4 px-4 py-3 md:px-8 md:py-5 bg-paper border-b border-neutral-200">
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="text-xl md:text-2xl font-serif tracking-wide">
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
            placeholder="Ürün, kullanıcı veya mağaza ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-ink transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5 text-sm ml-auto">
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Ara"
          className="md:hidden text-gray-500 hover:text-accent transition-colors"
        >
          <Search size={19} strokeWidth={1.5} />
        </button>

        <Link href="/intelligence" className="hidden md:inline hover:text-accent transition-colors">
          Stil Asistanı
        </Link>

        <Link
          href="/sell"
          className="hidden md:inline-flex border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
        >
          İlan Ver
        </Link>

        <Link href="/favorites">
          <Heart size={19} strokeWidth={1.5} className="text-gray-500 hover:text-accent transition-colors" />
        </Link>
        <button
          onClick={() => setMessagesOpen(true)}
          aria-label="Mesajlar"
          className="md:hidden text-gray-500 hover:text-accent transition-colors"
        >
          <Mail size={19} strokeWidth={1.5} />
        </button>
        <Link href="/messages" className="hidden md:inline">
          <Mail size={19} strokeWidth={1.5} className="text-gray-500 hover:text-accent transition-colors" />
        </Link>
        <NotificationBell />

        {user ? (
          <>
            <span className="hidden md:inline text-gray-500 text-xs">{user.email}</span>
            <button
              onClick={handleLogout}
              className="hidden md:inline-flex border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
            >
              Çıkış
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="hidden md:inline-flex border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
          >
            Giriş Yap
          </Link>
        )}

        {/* Mobile-only account avatar — replaces the email/Çıkış pair above,
            which was clipping on narrow screens. */}
        <div className="relative md:hidden">
          {user ? (
            <>
              <button
                onClick={() => setAccountMenuOpen((s) => !s)}
                onBlur={() => setTimeout(() => setAccountMenuOpen(false), 150)}
                aria-expanded={accountMenuOpen}
                aria-label="Hesap menüsü"
                className="block shrink-0"
              >
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username ?? "Profil"}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                    {(profile?.username ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 bg-paper border border-neutral-200 rounded shadow-lg z-50"
                  role="menu"
                  aria-label="Hesap menüsü"
                >
                  <Link
                    href={`/profile/${profile?.username ?? ""}`}
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Profilim
                  </Link>
                  <Link
                    href="/profile/edit"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Ayarlar
                  </Link>
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Çıkış Yap
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link href="/login" aria-label="Giriş yap" className="block shrink-0">
              <UserIcon size={22} strokeWidth={1.5} className="text-gray-500" />
            </Link>
          )}
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden fixed inset-0 z-[70] bg-paper flex flex-col px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                strokeWidth={1.5}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                autoFocus
                type="text"
                placeholder="Ürün, kullanıcı veya mağaza ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-2 text-base text-gray-700 focus:outline-none focus:border-ink transition-colors"
              />
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Kapat"
              className="text-gray-500 hover:text-ink transition-colors"
            >
              <X size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {mounted &&
        createPortal(
          <AnimatePresence>
            {messagesOpen && <MobileMessagesPanel onClose={() => setMessagesOpen(false)} />}
          </AnimatePresence>,
          document.body
        )}
    </nav>
  );
}
