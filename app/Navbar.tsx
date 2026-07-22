"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Search,
  Heart,
  Mail,
  Compass,
  Sparkles,
  Trophy,
  UsersRound,
  X,
  User as UserIcon,
  ShoppingBag,
  PenLine,
  Handshake,
} from "lucide-react";
import { supabase } from "./utils/supabase";
import { CART_UPDATED_EVENT } from "./utils/cart";
import { runWhenIdle } from "./utils/idle";
import { openComposePost } from "./utils/composeEvents";
import NotificationBell from "./components/NotificationBell";

// Mesaj paneli (framer-motion kullanır) yalnızca açıldığında yüklenir.
const MobileMessagesPanel = dynamic(() => import("./components/MobileMessagesPanel"), {
  ssr: false,
});
import type { User } from "@supabase/supabase-js";

type Profile = { username: string; avatar_url: string | null };

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
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

    async function loadCart(uid: string) {
      const { data } = await supabase.from("cart_items").select("quantity").eq("user_id", uid);
      if (active) {
        setCartCount((data ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0));
      }
    }

    // Sayfa ilk yüklendiğinde mevcut oturumu al. Sepet sayısı ilk boyamayı
    // bekletmesin — tarayıcı boşta kalınca yüklenir.
    let cancelIdle = () => {};
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        const uid = data.user.id;
        loadProfile(uid);
        cancelIdle = runWhenIdle(() => loadCart(uid));
      }
    });

    // Giriş / çıkış olaylarını dinle, Navbar otomatik güncellensin
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadCart(session.user.id);
      } else {
        setProfile(null);
        setCartCount(0);
      }
    });

    const handleCartUpdated = () => {
      if (user?.id) {
        supabase.from("cart_items").select("quantity").eq("user_id", user.id).then(({ data }) => {
          setCartCount((data ?? []).reduce((sum, row) => sum + (row.quantity ?? 0), 0));
        });
      }
    };

    window.addEventListener(CART_UPDATED_EVENT, handleCartUpdated);

    return () => {
      active = false;
      cancelIdle();
      listener.subscription.unsubscribe();
      window.removeEventListener(CART_UPDATED_EVENT, handleCartUpdated);
    };
  }, [user?.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keşfet menüsü: onBlur ile kapatma masaüstünde güvenilir değildi —
  // butonun blur'u, içindeki bir Link'e tıklandığında navigasyondan ÖNCE
  // tetiklenip menüyü kapatabiliyor, tıklamayı bazen yutuyordu. Dış
  // tıklamayı dinleyen aynı desen NotificationBell'te de kullanılıyor.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

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
    <nav className="fixed w-full z-40 flex items-center gap-4 px-4 py-2.5 md:px-8 md:py-3 bg-paper border-b border-neutral-200">
      <div className="flex items-center gap-3 shrink-0">
        <Link href="/" className="text-xl font-serif font-extrabold tracking-tight text-light">
          Neith<span className="text-primary">.</span>
        </Link>

        {/* Explore dropdown — ikon odaklı kompakt tetikleyici */}
        <div className="relative" ref={exploreRef}>
          <button
            aria-expanded={open}
            onClick={() => setOpen((s) => !s)}
            className="flex items-center p-1.5 text-light hover:text-primary transition-colors"
            aria-label="Keşfet"
            title="Keşfet"
          >
            <Compass size={19} strokeWidth={2} />
          </button>

          {open && (
            <div className="absolute left-0 mt-2 w-56 bg-surface border border-neutral-200 rounded shadow-lg z-50" role="menu" aria-label="Keşfet menüsü">
              <nav className="flex flex-col py-2" role="menu">
                <Link
                  href={profile?.username ? `/profile/${profile.username}#outfits` : "/login"}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profilim
                </Link>
                <Link href="/outfits" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Kombin Akışı</Link>
                <Link href="/era" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dönemler</Link>
                <Link href="/fashion-week" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Moda Haftası</Link>
                <Link href="/#recommendations" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Kombin Önerileri</Link>
                <Link href="/live" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Canlı Akış</Link>
                <Link href="/brands" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Marka Vitrini</Link>
                <Link href="/editorial" role="menuitem" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Moda Dergisi</Link>
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center gap-4 px-8">
        <div className="relative w-full max-w-md">
          <Search
            size={15}
            strokeWidth={2}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Ürün, kullanıcı veya mağaza ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-5 text-sm ml-auto">
        <button
          onClick={() => setMobileSearchOpen(true)}
          aria-label="Ara"
          className="md:hidden text-light hover:text-primary transition-colors"
        >
          <Search size={19} strokeWidth={2} />
        </button>

        <Link
          href="/intelligence"
          aria-label="Stil Asistanı"
          title="Stil Asistanı"
          className="hidden md:inline text-light hover:text-primary transition-colors"
        >
          <Sparkles size={19} strokeWidth={2} />
        </Link>

        <Link
          href="/achievements"
          aria-label="Başarılarım"
          title="Başarılarım"
          className="hidden md:inline text-light hover:text-primary transition-colors"
        >
          <Trophy size={19} strokeWidth={2} />
        </Link>

        <Link
          href="/deals"
          aria-label="Anlaşmalarım"
          title="Anlaşmalarım"
          className="hidden md:inline text-light hover:text-primary transition-colors"
        >
          <Handshake size={19} strokeWidth={2} />
        </Link>

        <Link
          href="/twins"
          aria-label="Stil İkizlerim"
          title="Stil İkizlerim"
          className="hidden md:inline text-light hover:text-primary transition-colors"
        >
          <UsersRound size={19} strokeWidth={2} />
        </Link>

        <Link
          href="/sell"
          className="hidden md:inline-flex bg-primary text-dark font-semibold text-xs uppercase tracking-wide px-4 py-1.5 rounded-lg hover:bg-primary-hover transition-colors duration-300"
        >
          İlan Ver
        </Link>

        <button
          type="button"
          onClick={openComposePost}
          aria-label="Gönderi paylaş"
          title="Gönderi Paylaş"
          className="hidden md:inline text-light hover:text-primary transition-colors"
        >
          <PenLine size={19} strokeWidth={2} />
        </button>

        <Link href="/favorites">
          <Heart size={19} strokeWidth={2} className="text-light hover:text-primary transition-colors" />
        </Link>
        <Link href="/cart" className="relative">
          <ShoppingBag size={19} strokeWidth={2} className="text-light hover:text-primary transition-colors" />
          {cartCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-yellow px-1 text-[10px] font-semibold text-dark">
              {cartCount}
            </span>
          )}
        </Link>
        <button
          onClick={() => setMessagesOpen(true)}
          aria-label="Mesajlar"
          className="md:hidden text-light hover:text-primary transition-colors"
        >
          <Mail size={19} strokeWidth={2} />
        </button>
        <Link href="/messages" className="hidden md:inline">
          <Mail size={19} strokeWidth={2} className="text-light hover:text-primary transition-colors" />
        </Link>
        <NotificationBell />

        {user ? (
          <button
            onClick={handleLogout}
            className="hidden md:inline-flex border border-dark-3 text-light text-xs uppercase tracking-wide px-4 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors duration-300"
          >
            Çıkış
          </button>
        ) : (
          <Link
            href="/login"
            className="hidden md:inline-flex border border-dark-3 text-light text-xs uppercase tracking-wide px-4 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors duration-300"
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
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent-yellow flex items-center justify-center text-xs font-semibold text-dark">
                    {(profile?.username ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {accountMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 bg-surface border border-neutral-200 rounded shadow-lg z-50"
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
                  <Link
                    href="/deals"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Anlaşmalarım
                  </Link>
                  <Link
                    href="/my-posts"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Gönderilerim
                  </Link>
                  <Link
                    href="/intelligence"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Stil Asistanı
                  </Link>
                  <Link
                    href="/achievements"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Başarılarım
                  </Link>
                  <Link
                    href="/invite"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Arkadaşını Davet Et
                  </Link>
                  <Link
                    href="/twins"
                    role="menuitem"
                    className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Stil İkizlerim
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
              <UserIcon size={22} strokeWidth={2} className="text-light" />
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
                strokeWidth={2}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                autoFocus
                type="text"
                placeholder="Ürün, kullanıcı veya mağaza ara..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent border-b border-neutral-300 pl-6 pr-2 py-2 text-base text-gray-700 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Kapat"
              className="text-gray-500 hover:text-ink transition-colors"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {mounted &&
        messagesOpen &&
        createPortal(
          <MobileMessagesPanel onClose={() => setMessagesOpen(false)} />,
          document.body
        )}
    </nav>
  );
}
