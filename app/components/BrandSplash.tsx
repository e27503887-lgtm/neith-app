"use client";

import { useEffect, useState } from "react";

// İçerik arkada yüklenmeye devam eder; splash sadece kısa bir perde —
// en fazla 800ms. CSS geçişli, framer-motion'sız (JS bütçesi).
const SPLASH_KEY = "neith-splash-shown";
const SPLASH_MS = 800;
const FADE_MS = 400;

export default function BrandSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) return;

    sessionStorage.setItem(SPLASH_KEY, "1");
    const showFrame = requestAnimationFrame(() => setVisible(true));
    const fadeTimer = setTimeout(() => setFading(true), SPLASH_MS);
    const hideTimer = setTimeout(() => setVisible(false), SPLASH_MS + FADE_MS);
    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper transition-opacity duration-[400ms] ease-in-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <span className="font-serif text-4xl tracking-wide text-ink">Neith</span>
      <span className="mt-4 block w-24 h-px bg-neutral-200 overflow-hidden">
        <span className="block h-full w-full bg-accent animate-splash-line" />
      </span>
    </div>
  );
}
