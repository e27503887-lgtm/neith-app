import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 mt-16 py-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-gray-500">
        <span>© 2026 Neith</span>
        <span aria-hidden="true">·</span>
        <Link href="/legal/kvkk" className="hover:text-ink transition-colors">
          KVKK
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/kullanim-kosullari" className="hover:text-ink transition-colors">
          Kullanım Koşulları
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/legal/cerezler" className="hover:text-ink transition-colors">
          Çerezler
        </Link>
      </div>
    </footer>
  );
}
