"use client";

// Açık / Koyu / Sistem tema seçici. Tercih cookie'de tutulur (1 yıl);
// layout'taki inline script aynı cookie'yi ilk boyamadan ÖNCE okuyup
// <html>'e .dark sınıfını bastığı için sayfa açılışında flash olmaz.

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export type ThemePreference = "light" | "dark" | "system";

const COOKIE_NAME = "theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function readThemeCookie(): ThemePreference {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|; )theme=(dark|light|system)/);
  return (match?.[1] as ThemePreference) ?? "system";
}

function applyTheme(pref: ThemePreference) {
  const dark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setThemePreference(pref: ThemePreference) {
  document.cookie = `${COOKIE_NAME}=${pref};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
  applyTheme(pref);
}

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Açık", Icon: Sun },
  { value: "dark", label: "Koyu", Icon: Moon },
  { value: "system", label: "Sistem", Icon: Monitor },
];

export default function ThemeToggle() {
  // Cookie ancak istemcide okunabilir; SSR/hydration uyumu için mount sonrası.
  const [pref, setPref] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPref(readThemeCookie());

    // Sistem tercihi seçiliyken işletim sistemi teması değişirse anında uygula.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemeCookie() === "system") applyTheme("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function select(next: ThemePreference) {
    setPref(next);
    setThemePreference(next);
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Görünüm</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ value, label, Icon }) => {
          const selected = pref === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => select(value)}
              className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                selected
                  ? "bg-ink text-paper border-ink"
                  : "border-neutral-300 text-gray-600 hover:border-ink hover:text-ink"
              }`}
            >
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
