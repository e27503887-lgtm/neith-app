"use client";

// Alan bazlı anlık doğrulama geri bildirimi: hata varsa alanın altında
// küçük kırmızı mesaj, alan dokunulmuş ve geçerliyse yeşil onay işareti.

import { Check } from "lucide-react";

export default function FieldHint({
  error,
  valid = false,
}: {
  error?: string | null;
  valid?: boolean;
}) {
  if (error) {
    return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>;
  }
  if (valid) {
    return (
      <p className="mt-1 text-xs text-green-700 dark:text-green-400 inline-flex items-center gap-1">
        <Check size={12} strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Alan geçerli</span>
      </p>
    );
  }
  return null;
}
