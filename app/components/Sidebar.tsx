"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Sparkles, Swords, Store, ShoppingBag } from "lucide-react";

const ICON_SIZE = 20;
const STROKE_WIDTH = 1.5;

// "Dolabım" (Shirt ikonu, kendi profil/#outfits sekmesine gidiyordu)
// kaldırıldı — aynı hedefe artık Navbar'daki Keşfet menüsünden "Profilim"
// ile erişiliyor. Kalan 5 ikonun dikey aralığı buna göre genişletildi.
export default function Sidebar() {
  const pathname = usePathname();

  const items = [
    { href: "/live", label: "Ana Sayfa (Canlı Akış)", icon: Home },
    { href: "/intelligence", label: "Stil Karnesi", icon: Sparkles },
    { href: "/#kombin-savasi", label: "Kombin Savaşı", icon: Swords },
    { href: "/listings", label: "İlanlar", icon: ShoppingBag },
    { href: "/stores", label: "Mağazalar", icon: Store },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-30 h-screen w-16 flex-col items-center border-r border-neutral-200 bg-paper pt-24 pb-6">
      <nav className="flex flex-1 flex-col items-center gap-5 pt-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href.split("#")[0];

          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center transition-colors duration-200 hover:bg-gray-100 ${
                isActive ? "text-ink" : "text-gray-500"
              }`}
            >
              <Icon size={ICON_SIZE} strokeWidth={STROKE_WIDTH} />
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        title="Neith"
        className="flex h-10 w-10 items-center justify-center border-t border-neutral-200 pt-4 font-serif text-xl text-ink hover:text-accent transition-colors"
      >
        N
      </Link>
    </aside>
  );
}
