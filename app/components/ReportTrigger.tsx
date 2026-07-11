"use client";

// Küçük "Şikayet Et" tetikleyicisi + diyaloğu — detay sayfalarında
// tek satırlık zarif bir bağlantı olarak durur.

import { useState } from "react";
import { Flag } from "lucide-react";
import ReportDialog, { type ReportTargetType } from "./ReportDialog";

export default function ReportTrigger({
  targetType,
  targetId,
  className = "",
}: {
  targetType: ReportTargetType;
  targetId: number | string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1 text-xs text-gray-500 hover:text-accent transition-colors ${className}`}
      >
        <Flag size={12} strokeWidth={1.5} />
        Şikayet Et
      </button>
      <ReportDialog
        targetType={targetType}
        targetId={targetId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
