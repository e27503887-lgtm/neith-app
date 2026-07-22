"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { Home, Store, ShoppingBag, Plus, Tag, Shirt, Camera } from "lucide-react";
import { openComposePost } from "../utils/composeEvents";

const LEFT_ITEMS = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/outfits", label: "Kombinler", icon: Shirt },
];

const RIGHT_ITEMS = [
  { href: "/stores", label: "Mağazalar", icon: Store },
  { href: "/listings", label: "İlanlar", icon: ShoppingBag },
];

const MENU_OPTIONS = [
  { key: "sell", label: "İlan Ver", icon: Tag, href: "/sell" },
  { key: "outfit", label: "Kombin Paylaş", icon: Shirt, href: "/outfit/new" },
  { key: "story", label: "Gönderi Paylaş", icon: Camera, href: null },
] as const;

// Measured: the "+" button's visual center sits ~44px above the viewport bottom.
const PLUS_BUTTON_CENTER_OFFSET = 44;
const OPTION_STACK_GAP = 56;

// CSS geçişli menü — framer-motion'sız (mobil JS bütçesi).
export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleOptionClick(option: (typeof MENU_OPTIONS)[number]) {
    setMenuOpen(false);
    if (option.href) {
      router.push(option.href);
    } else {
      openComposePost();
    }
  }

  function renderItem(item: (typeof LEFT_ITEMS)[number]) {
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          active ? "text-primary" : "text-muted"
        }`}
      >
        <Icon
          size={20}
          strokeWidth={2}
          fill={active ? "rgba(0,188,240,0.25)" : "none"}
        />
        <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
        {/* Aktif sekme göstergesi: ikon/etiket altında 4px turkuaz nokta. */}
        <span
          className={`h-1 w-1 rounded-full bg-primary ${active ? "opacity-100" : "opacity-0"}`}
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <>
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-paper border-t border-neutral-200"
        style={{ height: "4rem", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {LEFT_ITEMS.map(renderItem)}

        <div className="relative flex flex-1 flex-col items-center justify-center">
          {MENU_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={option.key}
                className={`absolute left-1/2 -translate-x-1/2 transition-all duration-200 ease-out ${
                  menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-50 pointer-events-none"
                }`}
                style={{
                  bottom: PLUS_BUTTON_CENTER_OFFSET + (index + 1) * OPTION_STACK_GAP,
                  transitionDelay: menuOpen ? `${index * 50}ms` : "0ms",
                }}
              >
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-dark-3 text-light text-[11px] px-2.5 py-1 shadow">
                  {option.label}
                </span>
                <button
                  type="button"
                  aria-label={option.label}
                  tabIndex={menuOpen ? 0 : -1}
                  onClick={() => handleOptionClick(option)}
                  className="relative flex items-center justify-center w-11 h-11 rounded-full shadow-md bg-dark-3 text-primary transition-colors"
                >
                  <Icon size={18} strokeWidth={2} />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-accent-yellow text-dark shadow-[0_4px_16px_rgba(255,229,86,0.45)]"
          >
            <span
              className={`flex items-center justify-center transition-transform duration-200 ease-out ${
                menuOpen ? "rotate-45" : "rotate-0"
              }`}
            >
              <Plus size={22} strokeWidth={2.5} />
            </span>
          </button>
        </div>

        {RIGHT_ITEMS.map(renderItem)}
      </nav>
    </>
  );
}
