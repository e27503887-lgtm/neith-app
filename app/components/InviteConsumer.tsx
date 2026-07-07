"use client";

import { useEffect } from "react";
import { supabase } from "../utils/supabase";
import { consumePendingInviteCode } from "@/lib/invites";

// Mounted globally so the Google OAuth redirect (handled server-side in
// app/auth/callback/route.ts, which has no access to sessionStorage) still
// gets a chance to consume a pending invite code once the session lands
// back in the browser.
export default function InviteConsumer() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) consumePendingInviteCode(data.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        consumePendingInviteCode(session.user.id);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}
