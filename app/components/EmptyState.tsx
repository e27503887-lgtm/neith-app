import Link from "next/link";

// Tüm boş durumlar için tek bileşen: dark-2 ikon kutusu + turkuaz çizgi
// illüstrasyon + Syne başlık + yönlendiren sarı CTA. Akışlar, favoriler,
// sepet vb. hepsi aynı dilden konuşsun diye tek yerde.

type IllustrationKind = "hanger" | "frame";

function HangerIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Kanca */}
      <path d="M36 14a5 5 0 1 1 5-5" />
      {/* Askı gövdesi */}
      <path d="M36 14v6" />
      <path d="M36 20 10 40h52L36 20Z" />
      {/* Alt çubuk */}
      <path d="M10 40h52" />
    </svg>
  );
}

function FrameIllustration() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="12" y="10" width="48" height="52" />
      <rect x="20" y="18" width="32" height="36" />
      {/* Paspartu köşe çizgileri */}
      <path d="M12 10l8 8M60 10l-8 8M12 62l8-8M60 62l-8-8" />
    </svg>
  );
}

export default function EmptyState({
  illustration = "hanger",
  title,
  description,
  ctaLabel,
  ctaHref,
  className = "",
}: {
  illustration?: IllustrationKind;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center py-16 px-6 gap-4 ${className}`}>
      {/* İkon kutusu: dark-2 zemin, turkuaz ikon (stroke currentColor). */}
      <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-dark-2 text-primary">
        {illustration === "frame" ? <FrameIllustration /> : <HangerIllustration />}
      </div>
      <h3 className="font-serif text-2xl text-light">{title}</h3>
      {description && (
        <p className="text-sm text-muted leading-6 max-w-sm">{description}</p>
      )}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-2 inline-flex items-center justify-center bg-accent-yellow text-dark text-xs uppercase tracking-widest font-semibold px-6 py-3 rounded-xl transition-colors duration-300 hover:bg-accent-yellow-hover"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
