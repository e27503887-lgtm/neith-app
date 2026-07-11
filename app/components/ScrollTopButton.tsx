"use client";

// Biraz scroll edilince sağ altta beliren "yukarı dön" oku.
// Mobilde alt tab bar'ın üstünde durur.

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

const SHOW_AFTER_PX = 600;

export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setVisible(window.scrollY > SHOW_AFTER_PX);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Yukarı dön"
      className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-surface/95 text-ink shadow-sm backdrop-blur-sm hover:text-accent hover:border-accent transition-colors animate-fade-in"
    >
      <ArrowUp size={17} strokeWidth={1.5} />
    </button>
  );
}
