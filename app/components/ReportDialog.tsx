"use client";

// Şikayet diyaloğu — ciddi ama zarif: sebep seçimi + opsiyonel açıklama.
// reports tablosuna insert; başarıda kısa onay metni gösterip kapanır.

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";

export type ReportTargetType = "product" | "outfit" | "post" | "profile" | "comment";

export const REPORT_REASONS = [
  "Spam",
  "Dolandırıcılık",
  "Uygunsuz İçerik",
  "Taciz",
  "Sahte Ürün",
  "Diğer",
] as const;

export default function ReportDialog({
  targetType,
  targetId,
  open,
  onClose,
}: {
  targetType: ReportTargetType;
  targetId: number | string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!open) return null;

  function close() {
    setReason(null);
    setDescription("");
    setError("");
    setDone(false);
    onClose();
  }

  async function handleSubmit() {
    if (!reason || busy) return;

    setBusy(true);
    setError("");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { error: insertError } = await supabase.from("reports").insert([
      {
        reporter_id: userData.user.id,
        target_type: targetType,
        target_id: String(targetId),
        reason,
        description: description.trim() || null,
      },
    ]);

    if (insertError) {
      setError("Şikayet gönderilemedi: " + insertError.message);
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 animate-fade-in"
      onClick={close}
    >
      <div
        className="w-full max-w-sm bg-surface border border-neutral-200 p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Şikayet et"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="section-label mb-1">Topluluk Güvenliği</p>
            <h2 className="font-serif text-xl text-ink">Şikayet Et</h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Kapat"
            className="text-gray-500 hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div>
            <p className="text-sm text-gray-600 leading-6">
              Şikayetin alındı, inceleyeceğiz. Topluluğu güvenli tuttuğun için teşekkürler.
            </p>
            <button type="button" onClick={close} className="btn-primary mt-4">
              Kapat
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-xs uppercase tracking-wide px-3 py-1.5 border transition-colors duration-300 ${
                    reason === r
                      ? "bg-primary text-dark border-primary"
                      : "border-neutral-300 text-gray-600 hover:border-primary hover:text-ink"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              placeholder="Açıklama (opsiyonel)"
              rows={3}
              className="w-full p-3 border border-neutral-300 bg-surface text-sm resize-none"
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason || busy}
              className="btn-primary w-full"
            >
              {busy ? "Gönderiliyor..." : "Şikayeti Gönder"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
