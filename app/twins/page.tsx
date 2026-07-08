"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/utils/supabase";
import FollowButton from "@/app/components/FollowButton";

type TwinCandidate = {
  id: string;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
  size_top: string | null;
  size_bottom: string | null;
  size_shoe: number | null;
  style_tags: string[];
};

type ProductPreview = {
  id: string | number;
  title: string;
  image_url: string;
  user_id: string;
};

function formatMatchSummary(candidate: TwinCandidate, current: TwinCandidate) {
  const sharedSizes = [];
  if (candidate.size_top && current.size_top && candidate.size_top === current.size_top) {
    sharedSizes.push("aynı üst beden");
  }
  if (candidate.size_bottom && current.size_bottom && candidate.size_bottom === current.size_bottom) {
    sharedSizes.push("aynı alt beden");
  }

  const sharedStyleTags = candidate.style_tags.filter((tag) => current.style_tags.includes(tag));
  const sharedParts = [];
  if (sharedSizes.length > 0) {
    sharedParts.push(sharedSizes.join(" · "));
  }
  if (sharedStyleTags.length > 0) {
    sharedParts.push(`${sharedStyleTags.length} ortak stil`);
  }

  return sharedParts.length > 0 ? sharedParts.join(" · ") : "Benzer stil";
}

function calculateTwinScore(candidate: TwinCandidate, current: TwinCandidate) {
  let score = 0;
  if (candidate.size_top && current.size_top && candidate.size_top === current.size_top) {
    score += 3;
  }
  if (candidate.size_bottom && current.size_bottom && candidate.size_bottom === current.size_bottom) {
    score += 3;
  }
  if (
    candidate.size_shoe !== null &&
    current.size_shoe !== null &&
    Math.abs(candidate.size_shoe - current.size_shoe) <= 1
  ) {
    score += 2;
  }
  const sharedStyleTags = candidate.style_tags.filter((tag) => current.style_tags.includes(tag));
  score += sharedStyleTags.length * 2;
  return score;
}

export default function TwinsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<TwinCandidate | null>(null);
  const [candidates, setCandidates] = useState<Array<{ candidate: TwinCandidate; score: number }>>([]);
  const [productsByUser, setProductsByUser] = useState<Record<string, ProductPreview[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;
      if (!active) return;
      setUserId(uid);

      if (!uid) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type, size_top, size_bottom, size_shoe, style_tags, show_sizes")
        .eq("id", uid)
        .single();

      if (!active) return;
      if (!profile || !profile.show_sizes) {
        setCurrentProfile(null);
        setLoading(false);
        return;
      }

      const normalizedProfile: TwinCandidate = {
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        account_type: profile.account_type,
        size_top: profile.size_top,
        size_bottom: profile.size_bottom,
        size_shoe: profile.size_shoe,
        style_tags: profile.style_tags ?? [],
      };

      setCurrentProfile(normalizedProfile);

      const { data: candidateRows } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type, size_top, size_bottom, size_shoe, style_tags")
        .neq("id", uid)
        .eq("show_sizes", true);

      if (!active) return;

      const scored = (candidateRows ?? [])
        .map((candidate) => {
          const candidateRow: TwinCandidate = {
            id: candidate.id,
            username: candidate.username,
            avatar_url: candidate.avatar_url,
            account_type: candidate.account_type,
            size_top: candidate.size_top,
            size_bottom: candidate.size_bottom,
            size_shoe: candidate.size_shoe,
            style_tags: candidate.style_tags ?? [],
          };
          const score = calculateTwinScore(candidateRow, normalizedProfile);
          return { candidate: candidateRow, score };
        })
        .filter((item) => item.score >= 5)
        .sort((a, b) => b.score - a.score);

      const ids = scored.map((item) => item.candidate.id);
      const { data: products } = ids.length
        ? await supabase
            .from("products")
            .select("id, title, image_url, user_id")
            .in("user_id", ids)
            .order("created_at", { ascending: false })
        : { data: [] };

      if (!active) return;
      const grouped: Record<string, ProductPreview[]> = {};
      (products ?? []).forEach((product) => {
        const userProducts = grouped[product.user_id] ?? [];
        if (userProducts.length < 3) {
          userProducts.push(product);
          grouped[product.user_id] = userProducts;
        }
      });

      setCandidates(scored);
      setProductsByUser(grouped);
      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6">
        <div className="max-w-3xl mx-auto bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
          <p className="text-gray-500">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6">
        <div className="max-w-3xl mx-auto bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Stil İkizlerin</h1>
          <p className="mt-4 text-gray-500">Bu sayfayı görmek için giriş yapmalısın.</p>
          <Link href="/login" className="btn-primary mt-6 inline-block">
            Giriş Yap
          </Link>
        </div>
      </main>
    );
  }

  if (!currentProfile) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6">
        <div className="max-w-3xl mx-auto bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-ink">Stil İkizlerin</h1>
          <p className="mt-4 text-gray-500">
            Stil ikizlerini bulmak için beden ve stil bilgini tamamla.
          </p>
          <Link href="/profile/edit" className="btn-primary mt-6 inline-block">
            Profilimi Düzenle
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pt-24 px-6 pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm mb-8">
          <h1 className="text-3xl font-serif tracking-tight text-ink">Stil İkizlerin</h1>
          <p className="mt-3 text-gray-500">
            Beden, ayakkabı ve stil etiketlerine göre en uygun ikiz adaylarını sana getiriyoruz.
          </p>
        </div>

        {candidates.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm text-center">
            <p className="text-2xl font-semibold text-ink">Henüz stil ikizin katılmamış</p>
            <p className="mt-4 text-gray-500">
              Henüz stil ikizin platforma katılmamış — arkadaşlarını davet et!
            </p>
            <Link href="/invite" className="btn-primary mt-6 inline-block">
              Davet Et
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {candidates.map(({ candidate, score }) => (
              <div
                key={candidate.id}
                className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <Link href={`/profile/${candidate.username}`} className="shrink-0">
                      {candidate.avatar_url ? (
                        <Image
                          src={candidate.avatar_url}
                          alt={candidate.username}
                          width={72}
                          height={72}
                          className="w-18 h-18 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-18 h-18 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
                          {candidate.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link
                        href={`/profile/${candidate.username}`}
                        className="text-lg font-semibold text-ink hover:text-accent transition-colors"
                      >
                        @{candidate.username}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatMatchSummary(candidate, currentProfile)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FollowButton targetUserId={candidate.id} compact />
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(productsByUser[candidate.id] ?? []).length > 0 ? (
                    (productsByUser[candidate.id] ?? []).map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.id}`}
                        className="group block h-40 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100"
                      >
                        <div className="relative h-full overflow-hidden bg-gray-100">
                          <Image
                            src={product.image_url}
                            alt={product.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="col-span-full h-40 rounded-3xl border border-neutral-200 bg-neutral-100 flex items-center justify-center text-sm text-gray-500">
                      Satışta ürün bulunamadı.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
