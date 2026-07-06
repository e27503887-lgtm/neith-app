"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

// A gentle Material-style ease — softer than the CSS default "ease-in-out",
// which is what made the previous template.tsx-based transition (no exit
// animation, abrupt unmount) feel harsh.
const SOFT_EASE = [0.4, 0, 0.2, 1] as const;

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.4, ease: SOFT_EASE }}
        className="pb-40 md:pb-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
