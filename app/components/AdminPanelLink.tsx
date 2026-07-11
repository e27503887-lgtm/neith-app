"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

export default function AdminPanelLink({ profileId, isAdmin }: { profileId: string; isAdmin: boolean }) {
  const [isSelf, setIsSelf] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsSelf(data.user?.id === profileId);
    });
    return () => {
      active = false;
    };
  }, [profileId, isAdmin]);

  if (!isAdmin || !isSelf) return null;

  return (
    <Link
      href="/admin"
      className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
    >
      Yönetici Paneli
    </Link>
  );
}
