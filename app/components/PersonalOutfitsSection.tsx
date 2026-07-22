"use client";

// "Kombinlerim" (personal_outfits) — Dolabım'ın altında, tamamen kişisel.
// Kart: fotoğraf varsa göster, yoksa (≥2 parça) kombin akışındaki parça
// kolajını yeniden kullanır. Tıklayınca genişleyip not/parça listesi/uyum
// gerekçesini gösterir. RLS zaten sahiplik dışı erişimi engelliyor.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { getCategoryLabel } from "@/lib/categories";
import {
  buildWardrobeExplanation,
  computeWardrobeInsight,
  type PersonalOutfit,
  type WardrobeItem,
} from "@/lib/wardrobe";
import OutfitCollage from "./OutfitCollage";
import AddPersonalOutfitModal from "./AddPersonalOutfitModal";

type EnrichedOutfit = PersonalOutfit & { items: WardrobeItem[] };

// Öneriler sekmesi bir kombin kaydettiğinde bu bölümün listesini tazelemek
// için yayınlanır — prop drilling yerine hafif bir DOM olayı.
export const PERSONAL_OUTFITS_CHANGED_EVENT = "personal-outfits:changed";

export default function PersonalOutfitsSection({ user }: { user: User }) {
  const [outfits, setOutfits] = useState<EnrichedOutfit[] | null>(null);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showEmptyWardrobeWarning, setShowEmptyWardrobeWarning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: outfitRows }, { data: itemRows }, { data: linkRows }] = await Promise.all([
        supabase
          .from("personal_outfits")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("wardrobe_items").select("*").eq("user_id", user.id),
        supabase
          .from("personal_outfit_items")
          .select("personal_outfit_id, wardrobe_item_id"),
      ]);

      if (!active) return;

      const items = (itemRows ?? []) as WardrobeItem[];
      const itemById = new Map(items.map((i) => [i.id, i]));

      // Yalnızca bu kullanıcının kombinlerine ait bağlantılar kalsın.
      const outfitIds = new Set((outfitRows ?? []).map((o) => o.id));
      const itemsByOutfit = new Map<number | string, WardrobeItem[]>();
      (linkRows ?? []).forEach((link) => {
        if (!outfitIds.has(link.personal_outfit_id)) return;
        const item = itemById.get(link.wardrobe_item_id);
        if (!item) return;
        const list = itemsByOutfit.get(link.personal_outfit_id) ?? [];
        list.push(item);
        itemsByOutfit.set(link.personal_outfit_id, list);
      });

      setWardrobeItems(items);
      setOutfits(
        (outfitRows ?? []).map((o) => ({
          ...(o as PersonalOutfit),
          items: itemsByOutfit.get(o.id) ?? [],
        }))
      );
    }

    load();
    window.addEventListener(PERSONAL_OUTFITS_CHANGED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(PERSONAL_OUTFITS_CHANGED_EVENT, load);
    };
  }, [user.id]);

  function handleAddClick() {
    if (wardrobeItems.length === 0) {
      setShowEmptyWardrobeWarning(true);
      return;
    }
    setShowEmptyWardrobeWarning(false);
    setModalOpen(true);
  }

  function handleSaved(outfit: PersonalOutfit, items: WardrobeItem[]) {
    setOutfits((prev) => [{ ...outfit, items }, ...(prev ?? [])]);
    setModalOpen(false);
  }

  async function handleDelete(outfit: EnrichedOutfit) {
    const confirmed = window.confirm("Bu kombini silmek istediğine emin misin?");
    if (!confirmed) return;

    const { error } = await supabase.from("personal_outfits").delete().eq("id", outfit.id);
    if (!error) {
      setOutfits((prev) => (prev ?? []).filter((o) => o.id !== outfit.id));
      if (expandedId === outfit.id) setExpandedId(null);
    }
  }

  if (outfits === null) return null;

  return (
    <section className="border border-neutral-200 bg-surface p-6 md:p-8">
      <div className="intel-header intel-header--outfits flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-2">Kişisel</p>
          <h2 className="font-serif italic text-3xl text-ink">Kombinlerim</h2>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="intel-btn--outfits inline-flex items-center gap-1.5 bg-primary text-dark text-xs uppercase tracking-widest font-medium px-5 py-2.5 transition-colors hover:bg-accent shrink-0"
        >
          <Plus size={14} strokeWidth={2} />
          Kombin Ekle
        </button>
      </div>

      {showEmptyWardrobeWarning && (
        <p className="text-sm text-gray-600 border border-neutral-200 bg-paper px-4 py-3 mb-6">
          Önce{" "}
          <Link href="#dolabim" className="underline hover:text-accent transition-colors">
            Dolabım
          </Link>
          'a birkaç parça ekle — kombin kurmak için en az bir parçaya ihtiyacın var.
        </p>
      )}

      {outfits.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 gap-3">
          <p className="font-serif italic text-xl text-ink">Henüz bir kombin kaydetmedin.</p>
          <p className="text-sm text-gray-500">İlk kombinini ekleyerek başla!</p>
          <button
            type="button"
            onClick={handleAddClick}
            className="intel-btn--outfits mt-2 inline-flex items-center gap-1.5 bg-primary text-dark text-xs uppercase tracking-widest font-medium px-6 py-3 transition-colors hover:bg-accent"
          >
            <Plus size={14} strokeWidth={2} />
            Kombin Ekle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {outfits.map((outfit) => {
            const expanded = expandedId === outfit.id;
            const insight =
              outfit.items.length >= 2 ? computeWardrobeInsight(outfit.items) : null;
            const explanation = insight ? buildWardrobeExplanation(insight.reasonSet) : null;

            return (
              <div
                key={outfit.id}
                className={`border border-neutral-200 ${expanded ? "col-span-2 md:col-span-4" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : outfit.id)}
                  className="block w-full text-left"
                >
                  <div className={expanded ? "flex flex-col md:flex-row gap-4 p-4" : ""}>
                    <div
                      className={`relative overflow-hidden bg-neutral-50 ${
                        expanded ? "w-full md:w-64 aspect-square shrink-0" : "aspect-square w-full"
                      }`}
                    >
                      {outfit.photo_url ? (
                        <Image
                          src={outfit.photo_url}
                          alt={outfit.note ?? "Kombin"}
                          fill
                          sizes="(min-width: 768px) 20vw, 50vw"
                          className="object-cover"
                        />
                      ) : outfit.items.length >= 2 ? (
                        <OutfitCollage
                          pieces={outfit.items}
                          seedKey={outfit.id}
                          alt={outfit.note ?? "Kombin"}
                        />
                      ) : outfit.items[0] ? (
                        <Image
                          src={outfit.items[0].image_url}
                          alt={outfit.note ?? "Kombin"}
                          fill
                          sizes="(min-width: 768px) 20vw, 50vw"
                          className="object-cover"
                        />
                      ) : null}

                      {typeof outfit.compatibility_score === "number" && !expanded && (
                        <span className="absolute bottom-1.5 right-1.5 bg-paper/95 text-ink text-[11px] px-2 py-0.5">
                          <span className="font-serif">Uyum: {outfit.compatibility_score}/100</span>
                        </span>
                      )}
                      <span className="intel-strip intel-strip--outfits" aria-hidden />
                    </div>

                    {expanded && (
                      <div className="flex-1 min-w-0">
                        {typeof outfit.compatibility_score === "number" && (
                          <p className="font-serif text-lg text-ink mb-1">
                            Uyum: {outfit.compatibility_score}/100
                          </p>
                        )}
                        {explanation && (
                          <p className="font-serif italic text-sm text-gray-600 mb-3">
                            {explanation}
                          </p>
                        )}
                        {outfit.note && (
                          <p className="text-sm text-gray-700 leading-6 mb-3">{outfit.note}</p>
                        )}

                        {outfit.items.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {outfit.items.map((item) => (
                              <span
                                key={item.id}
                                className="flex items-center gap-1.5 border border-neutral-200 pl-1 pr-2 py-1"
                              >
                                <span className="relative w-6 h-6 shrink-0 overflow-hidden bg-neutral-50">
                                  <Image
                                    src={item.image_url}
                                    alt=""
                                    fill
                                    sizes="24px"
                                    className="object-cover"
                                  />
                                </span>
                                <span className="text-xs text-gray-600">
                                  {item.label?.trim() || getCategoryLabel(item.category) || "Parça"}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(outfit);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <AddPersonalOutfitModal
          user={user}
          wardrobeItems={wardrobeItems}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
