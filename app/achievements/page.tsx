"use client";

// NOT: Bu sayfa önceden bir SERVER component'ti ve auth kontrolü için
// sunucu tarafında `supabase.auth.getUser()` çağırıyordu. Ancak
// app/utils/supabase.ts'teki istemci düz bir tarayıcı istemcisi — oturum
// yalnızca localStorage'da tutuluyor ve sunucu render'ında hiç görünmüyor.
// Sonuç: kullanıcı gerçekten giriş yapmış olsa bile sunucu her zaman
// "kullanıcı yok" görüyordu ("Önce giriş yapmalısın" hatası). Diğer tüm
// auth kontrollü sayfalar (invite/twins/profile/edit/admin) zaten client
// component + useEffect deseniyle doğru çalışıyor — aynı desene çevrildi.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/app/utils/supabase";
import { BADGES, getBadgeInfo, type BadgeKey } from "@/lib/badges";

type Card = {
  key: BadgeKey;
  label: string;
  description: string;
  icon: LucideIcon | undefined;
  earned: boolean;
};

export default function AchievementsPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;

      const uid = data.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: badgeRows } = await supabase
          .from("badges")
          .select("badge_key")
          .eq("user_id", uid);

        if (!active) return;

        const earnedBadges = new Set<string>(
          (badgeRows ?? []).map((badge: { badge_key: string }) => badge.badge_key)
        );

        setCards(
          (Object.keys(BADGES) as BadgeKey[]).map((key) => {
            const badge = getBadgeInfo(key);
            return {
              key,
              label: badge?.label ?? key,
              description: badge?.description ?? "",
              icon: badge?.icon,
              earned: earnedBadges.has(key),
            };
          })
        );
      }

      setCheckingAuth(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (checkingAuth) {
    return null;
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6">
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="text-gray-500">Önce giriş yapmalısın.</p>
          <Link href="/login" className="btn-primary mt-6 inline-block">
            Giriş Yap
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-surface border border-neutral-200 rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-label">Başarılar</p>
              <h1 className="mt-2 text-3xl font-serif tracking-tight text-ink">Sana Özel Rozet Kupası</h1>
              <p className="mt-3 text-gray-500 max-w-2xl">
                Kazandıkların renkli, henüz kazanmadıkların ise hafif soluk bir tavırla gösteriliyor.
                İçlerinden birini nasıl alabileceğini de hemen görebilirsin.
              </p>
            </div>
            <Link href="/profile/edit" className="btn-primary">
              Profilini güncelle
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.key}
                className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 ${
                  card.earned
                    ? "border-ink bg-surface shadow-sm"
                    : "border-neutral-200 bg-paper text-gray-500"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                      card.earned ? "border-ink bg-ink text-paper" : "border-neutral-300 bg-surface text-gray-500"
                    }`}
                  >
                    {Icon ? <Icon size={20} strokeWidth={1.5} /> : "🏅"}
                  </span>
                  <div>
                    <h2 className={`font-serif text-xl ${card.earned ? "text-ink" : "text-gray-600"}`}>
                      {card.label}
                    </h2>
                    <p
                      className={`text-xs uppercase tracking-[0.24em] ${
                        card.earned ? "text-accent" : "text-gray-500"
                      }`}
                    >
                      {card.earned ? "Kazandın" : "Nasıl kazanılır"}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-6">{card.description}</p>
                {!card.earned && (
                  <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-3 text-xs text-gray-500">
                    Bu rozet için {card.description.toLowerCase()}.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
