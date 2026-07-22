"use client";

// Başkasının profilindeki "..." menüsü: Engelle / Engeli Kaldır + Şikayet Et.
// Engelleme onay ister ve etkisini açıklar; kendi profilinde hiç görünmez.

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import { blockUser, getBlockedUserIds, unblockUser } from "../utils/blocks";
import ReportDialog from "./ReportDialog";

export default function ProfileMenu({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!active) return;
      if (!uid || uid === targetUserId) return; // kendi profili: menü yok

      setVisible(true);
      const blocked = await getBlockedUserIds();
      if (active) setIsBlocked(blocked.has(targetUserId));
    }

    load();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleBlockToggle() {
    if (busy) return;

    if (!isBlocked) {
      const confirmed = window.confirm(
        "Bu kullanıcıyı engellemek istediğine emin misin? Engellenen kullanıcı seninle mesajlaşamaz, yeni sohbet açamaz; içerikleri akışlarında görünmez."
      );
      if (!confirmed) return;
    }

    setBusy(true);
    const error = isBlocked ? await unblockUser(targetUserId) : await blockUser(targetUserId);
    if (!error) {
      setIsBlocked(!isBlocked);
      router.refresh();
    }
    setBusy(false);
    setOpen(false);
  }

  if (!visible) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Profil seçenekleri"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center border border-neutral-200 text-gray-500 hover:text-ink hover:border-primary transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-44 bg-surface border border-neutral-200 shadow-lg z-40"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleBlockToggle}
            disabled={busy}
            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "İşleniyor..." : isBlocked ? "Engeli Kaldır" : "Engelle"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReportOpen(true);
            }}
            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Şikayet Et
          </button>
        </div>
      )}

      <ReportDialog
        targetType="profile"
        targetId={targetUserId}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
