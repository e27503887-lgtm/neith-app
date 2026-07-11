"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import OutfitCard from "../components/OutfitCard";
import OutfitLikeButton from "../components/OutfitLikeButton";
import { supabase } from "../utils/supabase";

export default function FashionWeekClient({ activeWeek, pastWeeks }: any) {
  const [entries, setEntries] = useState<any[]>([]);
  const [outfits, setOutfits] = useState<any[]>([]);
  const [likesByOutfit, setLikesByOutfit] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [myOutfits, setMyOutfits] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    if (!activeWeek) return;
    setLoading(true);
    async function load() {
      const { data: rows } = await supabase
        .from("fashion_week_entries")
        .select("*")
        .eq("week_id", activeWeek.id);

      setEntries(rows ?? []);

      const outfitIds = (rows ?? []).map((r: any) => r.outfit_id);
      if (outfitIds.length) {
        const { data: outfitRows } = await supabase.from("outfits").select("*").in("id", outfitIds);
        setOutfits(outfitRows ?? []);

        const { data: likes } = await supabase.from("outfit_likes").select("outfit_id").in("outfit_id", outfitIds);
        const map = new Map();
        (likes ?? []).forEach((l: any) => map.set(l.outfit_id, (map.get(l.outfit_id) ?? 0) + 1));
        setLikesByOutfit(map);
      } else {
        setOutfits([]);
        setLikesByOutfit(new Map());
      }

      setLoading(false);
    }

    load();
  }, [activeWeek]);

  async function openJoinModal() {
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) return (window.location.href = "/login");

    const { data: my } = await supabase.from("outfits").select("*").eq("user_id", uid);
    setMyOutfits(my ?? []);
    setShowModal(true);
  }

  async function joinWithOutfit(outfitId: any) {
    setShowModal(false);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) return;

    // Try insert; server RLS should enforce rules if present
    await supabase.from("fashion_week_entries").insert([{ week_id: activeWeek.id, outfit_id: outfitId, user_id: uid }]);
    // refresh
    const ev = await supabase.from("fashion_week_entries").select("*").eq("week_id", activeWeek.id);
    setEntries(ev.data ?? []);
  }

  async function withdraw(outfitId: any) {
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) return;
    await supabase
      .from("fashion_week_entries")
      .delete()
      .match({ week_id: activeWeek.id, outfit_id: outfitId, user_id: uid });
    const ev = await supabase.from("fashion_week_entries").select("*").eq("week_id", activeWeek.id);
    setEntries(ev.data ?? []);
  }

  const joinedOutfitIds = new Set(entries.map((e) => e.outfit_id));

  // sort outfits by likes desc
  const sorted = [...outfits].sort((a, b) => (likesByOutfit.get(b.id) ?? 0) - (likesByOutfit.get(a.id) ?? 0));

  return (
    <div>
      {activeWeek ? (
        <section className="max-w-6xl mx-auto">
          <div className="relative bg-paper rounded-lg overflow-hidden mb-8">
            {activeWeek.cover_image_url && (
              <div className="relative h-64 md:h-96">
                <Image src={activeWeek.cover_image_url} alt={activeWeek.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent" />
              </div>
            )}

            <div className="p-8 md:p-12">
              <h1 className="font-serif text-4xl md:text-6xl">{activeWeek.title}</h1>
              <p className="text-gray-600 mt-3 max-w-2xl">{activeWeek.description}</p>
              <div className="mt-4 text-sm text-gray-700">Bitimine: {Math.max(0, Math.ceil((new Date(activeWeek.ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} gün</div>

              <div className="mt-6">
                <button onClick={openJoinModal} className="btn-primary">
                  Kombinimle Katıl
                </button>
              </div>
            </div>
          </div>

          <h2 className="text-2xl mb-4">Katılan Kombinler</h2>

          {loading ? (
            <p>Yükleniyor...</p>
          ) : sorted.length === 0 ? (
            <p className="text-gray-500">Henüz kombin yok.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sorted.map((o, idx) => (
                <div key={o.id} className="relative">
                  {idx < 3 && (
                    <div className="absolute -top-3 -left-3 bg-surface border border-neutral-200 px-3 py-2 font-serif text-xl">
                      {idx + 1}.
                    </div>
                  )}
                  <OutfitCard outfit={{ id: o.id, title: o.title, image_url: o.image_url, username: o.username, avatar_url: o.avatar_url, account_type: o.account_type }} />
                  <div className="mt-2 flex items-center justify-between px-1">
                    <OutfitLikeButton outfitId={o.id} />
                    {joinedOutfitIds.has(o.id) ? (
                      <div className="text-sm text-green-700">Katıldın ✓ <button className="ml-2 text-xs underline" onClick={() => withdraw(o.id)}>Geri Çek</button></div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-paper rounded-lg p-6 w-full max-w-2xl">
                <h3 className="text-lg mb-4">Katılmak için kombin seç</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {myOutfits.length === 0 ? (
                    <p className="text-gray-500">Hiç kombininiz yok.</p>
                  ) : (
                    myOutfits.map((m) => (
                      <div key={m.id} className="border rounded overflow-hidden">
                        <div className="relative w-full aspect-[3/4]">
                          <Image src={m.image_url} alt={m.title} fill className="object-cover" />
                        </div>
                        <div className="p-2">
                          <div className="text-sm truncate">{m.title}</div>
                          <button className="btn-primary mt-2 w-full" onClick={() => joinWithOutfit(m.id)}>Katıl</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 text-right">
                  <button className="px-4 py-2 text-sm" onClick={() => setShowModal(false)}>Kapat</button>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="max-w-6xl mx-auto">
          <div className="py-12 text-center">
            <h2 className="text-2xl">Şu an aktif moda haftası yok</h2>
            <p className="text-gray-500 mt-2">Geçmiş etkinlikler</p>
          </div>

          {pastWeeks.map((w: any) => (
            <div key={w.id} className="bg-surface border border-neutral-200 rounded mb-6 p-4">
              <div className="flex items-center gap-4">
                {w.cover_image_url && (
                  <div className="w-28 h-20 relative">
                    <Image src={w.cover_image_url} alt={w.title} fill className="object-cover rounded" />
                  </div>
                )}
                <div>
                  <h3 className="font-serif text-lg">{w.title}</h3>
                  <p className="text-sm text-gray-600">{w.description}</p>
                  <Link href={`/fashion-week/${w.id}`} className="text-xs underline mt-2 inline-block">Detaylar</Link>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
