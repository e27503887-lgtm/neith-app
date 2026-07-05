"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Sparkles, Store, ShoppingBag, Plus } from "lucide-react";

const LEFT_ITEMS = [
  { href: "/live", label: "Ana Sayfa", icon: Home },
  { href: "/intelligence", label: "Stil", icon: Sparkles },
];

const RIGHT_ITEMS = [
  { href: "/stores", label: "Mağazalar", icon: Store },
  { href: "/listings", label: "İlanlar", icon: ShoppingBag },
];

export default function MobileTabBar() {
  const pathname = usePathname();

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
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-paper border-t border-neutral-200"
      style={{ height: "4rem", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {LEFT_ITEMS.map(renderItem)}

      <Link href="/sell" aria-label="İlan Ver" className="flex flex-1 flex-col items-center justify-center">
        <span className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-ink text-paper shadow-[0_2px_14px_rgba(0,0,0,0.2)]">
          <Plus size={22} strokeWidth={1.5} />
        </span>
      </Link>

      {RIGHT_ITEMS.map(renderItem)}
    </nav>
  );
}
