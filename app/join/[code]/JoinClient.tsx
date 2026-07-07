"use client";

import { useEffect } from "react";
import Link from "next/link";
import { setPendingInviteCode } from "@/lib/invites";

export default function JoinClient({ code }: { code: string }) {
  useEffect(() => {
    setPendingInviteCode(code);
  }, [code]);

  return (
    <Link href="/login" className="btn-primary w-full">
      Katıl
    </Link>
  );
}
