"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

export default function EditProfileButton({ profileId }: { profileId: string }) {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === profileId);
    });
  }, [profileId]);

  if (!isOwner) return null;

  return (
    <Link
      href="/profile/edit"
      className="border border-ink text-ink text-xs uppercase tracking-wide px-4 py-1.5 hover:bg-ink hover:text-paper transition-colors duration-300"
    >
      Profili Düzenle
    </Link>
  );
}
