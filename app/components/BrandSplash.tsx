"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SPLASH_KEY = "neith-splash-shown";
const SPLASH_MS = 1100;

export default function BrandSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY)) return;

    sessionStorage.setItem(SPLASH_KEY, "1");
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper"
        >
          <span className="font-serif text-4xl tracking-wide text-ink">Neith</span>
          <span className="mt-4 block w-24 h-px bg-neutral-200 overflow-hidden">
            <span className="block h-full w-full bg-accent animate-splash-line" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
