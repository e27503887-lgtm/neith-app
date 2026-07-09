"use client";

import { useEffect, useRef, useState } from "react";

// Görünür olana kadar çocuklarını mount etmez: ekran dışındaki (veya mobilde
// display:none ile gizlenen) bölümlerin sorguları ve hydration maliyeti ilk
// boyayı bloklamaz. display:none elemanlarda IntersectionObserver hiç
// tetiklenmez — masaüstüne özel bölümler mobilde hiç çalışmaz.
export default function LazyVisible({
  children,
  minHeight = 120,
  className,
}: {
  children: React.ReactNode;
  minHeight?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
