"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Sparkles, Store, ShoppingBag, Plus, Tag, Shirt, Camera, Lock } from "lucide-react";

const LEFT_ITEMS = [
  { href: "/live", label: "Ana Sayfa", icon: Home },
  { href: "/intelligence", label: "Stil", icon: Sparkles },
];

const RIGHT_ITEMS = [
  { href: "/stores", label: "Mağazalar", icon: Store },
  { href: "/listings", label: "İlanlar", icon: ShoppingBag },
];

const MENU_OPTIONS = [
  { key: "sell", label: "İlan Ver", icon: Tag, active: true, href: "/sell" },
  { key: "outfit", label: "Kombin Paylaş", icon: Shirt, active: false },
  { key: "story", label: "Öykü Paylaş", icon: Camera, active: false },
] as const;

// Measured: the "+" button's visual center sits ~44px above the viewport bottom.
const PLUS_BUTTON_CENTER_OFFSET = 44;
const OPTION_STACK_GAP = 72;

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showComingSoon() {
    setToast("Yakında");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  }

  function handleOptionClick(option: (typeof MENU_OPTIONS)[number]) {
    if (!option.active) {
      showComingSoon();
      return;
    }
    setMenuOpen(false);
    if (option.href) router.push(option.href);
  }

  function renderItem(item: (typeof LEFT_ITEMS)[number]) {
    const Icon = item.icon;
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex flex-1 flex-col items-center justify-center gap-1 ${
          active ? "text-ink" : "text-gray-400"
        }`}
      >
        <Icon size={20} strokeWidth={1.5} />
        <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
      </Link>
    );
  }

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-paper border-t border-neutral-200"
        style={{ height: "4rem", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {LEFT_ITEMS.map(renderItem)}

        <div className="relative flex flex-1 flex-col items-center justify-center">
          <AnimatePresence>
            {menuOpen &&
              MENU_OPTIONS.map((option, index) => {
                const Icon = option.icon;
                return (
                  <motion.div
                    key={option.key}
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ bottom: PLUS_BUTTON_CENTER_OFFSET + (index + 1) * OPTION_STACK_GAP }}
                    custom={index}
                    initial={{ opacity: 0, scale: 0.3, y: 16 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: { delay: index * 0.05, duration: 0.2, ease: "easeOut" },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.3,
                      y: 16,
                      transition: { delay: (MENU_OPTIONS.length - 1 - index) * 0.05, duration: 0.15, ease: "easeIn" },
                    }}
                  >
                    <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-ink text-paper text-[11px] px-2.5 py-1 shadow">
                      {option.label}
                    </span>
                    <button
                      type="button"
                      aria-label={option.label}
                      onClick={() => handleOptionClick(option)}
                      className={`relative flex items-center justify-center w-11 h-11 rounded-full shadow-md transition-colors ${
                        option.active
                          ? "bg-ink text-paper"
                          : "bg-neutral-200 text-neutral-400 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      {!option.active && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-neutral-400 text-paper">
                          <Lock size={9} strokeWidth={2} />
                        </span>
                      )}
                    </button>
                  </motion.div>
                );
              })}
          </AnimatePresence>

          <button
            type="button"
            aria-label={menuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-ink text-paper shadow-[0_2px_14px_rgba(0,0,0,0.2)]"
          >
            <motion.span
              animate={{ rotate: menuOpen ? 45 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex items-center justify-center"
            >
              <Plus size={22} strokeWidth={1.5} />
            </motion.span>
          </button>
        </div>

        {RIGHT_ITEMS.map(renderItem)}
      </nav>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="md:hidden fixed left-1/2 -translate-x-1/2 z-50 rounded-full bg-ink text-paper text-xs px-3 py-1.5 shadow-lg"
            style={{ bottom: "5.5rem" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
