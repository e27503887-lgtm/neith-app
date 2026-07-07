import { supabase } from "../app/utils/supabase";

const PENDING_INVITE_KEY = "neith_pending_invite_code";

export function setPendingInviteCode(code: string) {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, code);
  } catch {
    // sessionStorage unavailable (private mode, etc.) — invite just won't be tracked.
  }
}

export async function consumePendingInviteCode(invitedUserId: string) {
  let code: string | null = null;
  try {
    code = sessionStorage.getItem(PENDING_INVITE_KEY);
  } catch {
    return;
  }

  if (!code) return;

  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // ignore
  }

  const { data: inviter } = await supabase
    .from("profiles")
    .select("id")
    .eq("invite_code", code)
    .maybeSingle();

  if (!inviter || inviter.id === invitedUserId) return;

  // Self-invite and duplicate-invite are already rejected by DB constraints;
  // any resulting error is intentionally swallowed.
  await supabase.from("invites").insert([{ inviter_id: inviter.id, invited_id: invitedUserId }]);
}
