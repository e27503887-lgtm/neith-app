"use client";

import { usePathname } from "next/navigation";

// CSS tabanlı sayfa geçişi: framer-motion'ı kritik yoldan çıkarır (JS bütçesi).
// key={pathname} her navigasyonda animasyonu yeniden tetikler.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page-in pb-40 md:pb-0">
      {children}
    </div>
  );
}
