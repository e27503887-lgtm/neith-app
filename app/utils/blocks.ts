import { supabase } from "./supabase";

// Engelleme yardımcıları. Engellenen kullanıcı kimlikleri oturum boyunca
// modül düzeyinde önbelleklenir — her akış bileşeni ayrı sorgu atmasın.
// Engelle/kaldır işlemleri önbelleği düşürür.

let cache: Promise<Set<string>> | null = null;

export function invalidateBlockedCache() {
  cache = null;
}

export function getBlockedUserIds(): Promise<Set<string>> {
  if (!cache) {
    cache = (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return new Set<string>();

      const { data } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", uid);

      return new Set<string>((data ?? []).map((r) => r.blocked_id));
    })();
  }
  return cache;
}

export async function blockUser(blockedId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return "Giriş yapmalısın.";

  const { error } = await supabase
    .from("blocks")
    .insert([{ blocker_id: uid, blocked_id: blockedId }]);

  invalidateBlockedCache();
  // 23505: zaten engelli — hata sayma.
  if (error && error.code !== "23505") return error.message;
  return null;
}

export async function unblockUser(blockedId: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return "Giriş yapmalısın.";

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", uid)
    .eq("blocked_id", blockedId);

  invalidateBlockedCache();
  return error ? error.message : null;
}
