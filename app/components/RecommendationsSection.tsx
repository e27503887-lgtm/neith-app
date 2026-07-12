"use client";

// "Öneriler" — Kombinlerim'in altında, tamamen kişisel. İki sekme:
// Sıfırdan Kombin Oluştur (dolaptaki tüm geçerli kombinasyonları tarar) ve
// Bu Parçayı Tamamla (seçilen parçaya göre tamamlayıcı önerir). Motor
// hesaplaması lib/wardrobeSuggestions.ts'te (outfit-engine + wardrobe
// yardımcılarını yeniden kullanır); bu bileşen yalnızca sunum.

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { getCategoryLabel } from "@/lib/categories";
import { computeWardrobeInsight, type PersonalOutfit, type WardrobeItem } from "@/lib/wardrobe";
import {
  buildCompletionSuggestions,
  buildFromScratchCandidates,
  getMissingCompletionCategories,
  getMissingScratchCategories,
} from "@/lib/wardrobeSuggestions";
import { PERSONAL_OUTFITS_CHANGED_EVENT } from "./PersonalOutfitsSection";

type Tab = "scratch" | "complete";

async function savePersonalOutfit(userId: string, items: WardrobeItem[]) {
  const insight = items.length >= 2 ? computeWardrobeInsight(items) : null;

  const { data: outfit, error: insertError } = await supabase
    .from("personal_outfits")
    .insert([{ user_id: userId, photo_url: null, note: null, compatibility_score: insight?.score ?? null }])
    .select("*")
    .single();

  if (insertError || !outfit) {
    return { error: insertError?.message ?? "Kombin kaydedilemedi." };
  }

  const rows = items.map((item) => ({
    personal_outfit_id: outfit.id,
    wardrobe_item_id: item.id,
  }));
  const { error: itemsError } = await supabase.from("personal_outfit_items").insert(rows);
  if (itemsError) {
    return { error: itemsError.message };
  }

  window.dispatchEvent(new CustomEvent(PERSONAL_OUTFITS_CHANGED_EVENT));
  return { outfit: outfit as PersonalOutfit };
}

function MiniStrip({ items }: { items: WardrobeItem[] }) {
  return (
    <div className="flex -space-x-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="relative w-14 h-14 shrink-0 overflow-hidden border-2 border-surface bg-neutral-50"
        >
          <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
        </span>
      ))}
    </div>
  );
}

function ScratchTab({ user, wardrobeItems }: { user: User; wardrobeItems: WardrobeItem[] }) {
  const candidates = useMemo(() => buildFromScratchCandidates(wardrobeItems), [wardrobeItems]);
  const missing = useMemo(() => getMissingScratchCategories(wardrobeItems), [wardrobeItems]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIndex(0);
    setSaved(false);
  }, [wardrobeItems]);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-gray-600 border border-neutral-200 bg-paper px-4 py-3">
        Kombin kurmak için dolabına en az bir {missing.join(", ").toLowerCase()} ekle.
      </p>
    );
  }

  const current = candidates[index % candidates.length];

  async function handleSave() {
    setBusy(true);
    setError("");
    const result = await savePersonalOutfit(user.id, current.items);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div className="border border-neutral-200 bg-paper p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <MiniStrip items={current.items} />
        <p className="font-serif text-xl text-ink shrink-0">Uyum: {current.score}/100</p>
      </div>
      <p className="font-serif italic text-sm text-gray-600 mb-4">{current.explanation}</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
      {saved && <p className="text-sm text-green-700 dark:text-green-400 mb-3">Kombinlerim'e eklendi.</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Kaydediliyor..." : "Bu Kombini Kaydet"}
        </button>
        {candidates.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setIndex((i) => (i + 1) % candidates.length);
              setSaved(false);
            }}
            className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
          >
            Başka Öner
          </button>
        )}
      </div>
    </div>
  );
}

function CompleteTab({ user, wardrobeItems }: { user: User; wardrobeItems: WardrobeItem[] }) {
  const [anchorId, setAnchorId] = useState<number | string | null>(wardrobeItems[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (anchorId === null && wardrobeItems[0]) setAnchorId(wardrobeItems[0].id);
  }, [wardrobeItems, anchorId]);

  const anchor = wardrobeItems.find((i) => i.id === anchorId) ?? null;

  const suggestions = useMemo(
    () => (anchor ? buildCompletionSuggestions(anchor, wardrobeItems) : []),
    [anchor, wardrobeItems]
  );
  const missing = useMemo(
    () => (anchor ? getMissingCompletionCategories(anchor, wardrobeItems) : []),
    [anchor, wardrobeItems]
  );

  async function handleSave() {
    if (!anchor) return;
    setBusy(true);
    setError("");
    const items = [anchor, ...suggestions.map((s) => s.item)];
    const result = await savePersonalOutfit(user.id, items);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">Tamamlanacak parçayı seç</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {wardrobeItems.map((item) => {
          const selected = item.id === anchorId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setAnchorId(item.id);
                setSaved(false);
              }}
              className={`relative w-14 h-14 shrink-0 overflow-hidden border-2 ${
                selected ? "border-ink" : "border-transparent"
              }`}
            >
              <Image src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          );
        })}
      </div>

      {!anchor ? (
        <p className="text-sm text-gray-500">Bir parça seç.</p>
      ) : (
        <div className="border border-neutral-200 bg-paper p-5">
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-600">
              Bu parçayı tamamlamak için dolabına {missing.join(", ").toLowerCase()} ekle.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {suggestions.map((s) => (
                  <div key={s.item.id} className="border border-neutral-200 bg-surface p-3">
                    <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 mb-2">
                      <Image src={s.item.image_url} alt="" fill sizes="200px" className="object-cover" />
                      <span className="absolute bottom-1 left-1 bg-paper/90 text-ink text-[9px] uppercase tracking-wide px-1.5 py-0.5">
                        {getCategoryLabel(s.category)}
                      </span>
                    </div>
                    <p className="font-serif italic text-xs text-gray-600 leading-5">{s.explanation}</p>
                  </div>
                ))}
              </div>

              {missing.length > 0 && (
                <p className="text-xs text-gray-500 mb-3">
                  Ayrıca dolabına {missing.join(", ").toLowerCase()} eklersen daha fazla seçenek görürsün.
                </p>
              )}

              {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
              {saved && (
                <p className="text-sm text-green-700 dark:text-green-400 mb-3">Kombinlerim'e eklendi.</p>
              )}

              <button type="button" onClick={handleSave} disabled={busy} className="btn-primary">
                {busy ? "Kaydediliyor..." : "Bu Kombinasyonu Kaydet"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecommendationsSection({ user }: { user: User }) {
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[] | null>(null);
  const [tab, setTab] = useState<Tab>("scratch");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("wardrobe_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (active) setWardrobeItems((data ?? []) as WardrobeItem[]);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  if (wardrobeItems === null) return null;

  return (
    <section className="border border-neutral-200 bg-surface p-6 md:p-8">
      <div className="mb-6">
        <p className="section-label mb-2">Kişisel</p>
        <h2 className="font-serif italic text-3xl text-ink">Öneriler</h2>
      </div>

      {wardrobeItems.length === 0 ? (
        <p className="text-sm text-gray-500">
          Öneri görebilmek için önce Dolabım'a birkaç parça ekle.
        </p>
      ) : (
        <>
          <div className="flex gap-6 border-b border-neutral-200 mb-6">
            {(
              [
                { value: "scratch", label: "Sıfırdan Kombin Oluştur" },
                { value: "complete", label: "Bu Parçayı Tamamla" },
              ] as { value: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`pb-3 -mb-px border-b-2 text-sm font-medium transition-colors ${
                  tab === t.value
                    ? "border-accent text-ink"
                    : "border-transparent text-gray-500 hover:text-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "scratch" ? (
            <ScratchTab user={user} wardrobeItems={wardrobeItems} />
          ) : (
            <CompleteTab user={user} wardrobeItems={wardrobeItems} />
          )}
        </>
      )}
    </section>
  );
}
