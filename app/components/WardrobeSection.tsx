"use client";

// "Dolabım" — tamamen kişisel gardırop kataloğu (wardrobe_items). RLS
// sahiplik dışı erişimi zaten engelliyor; bu bölüm hiçbir public
// akışa/profile karışmaz, yalnızca /intelligence'da, kendi oturumunda
// görünür.

import { useEffect, useState } from "react";
import Image from "next/image";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";
import { getCategoryLabel } from "@/lib/categories";
import { normalizeWardrobeLabel, WARDROBE_OTHER_LABEL, type WardrobeItem } from "@/lib/wardrobe";
import AddWardrobeItemModal from "./AddWardrobeItemModal";

export default function WardrobeSection({ user }: { user: User }) {
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [revealedId, setRevealedId] = useState<number | string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("wardrobe_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (active) setItems((data ?? []) as WardrobeItem[]);
    }

    load();
    return () => {
      active = false;
    };
  }, [user.id]);

  function openAddModal() {
    setEditingItem(null);
    setModalOpen(true);
  }

  function openEditModal(item: WardrobeItem) {
    setEditingItem(item);
    setModalOpen(true);
  }

  function handleSaved(saved: WardrobeItem) {
    setItems((prev) => {
      const current = prev ?? [];
      const exists = current.some((i) => i.id === saved.id);
      return exists ? current.map((i) => (i.id === saved.id ? saved : i)) : [...current, saved];
    });
    setModalOpen(false);
    setEditingItem(null);
  }

  async function handleDelete(item: WardrobeItem) {
    const confirmed = window.confirm("Bu parçayı dolabından kaldırmak istediğine emin misin?");
    if (!confirmed) return;

    const { error } = await supabase.from("wardrobe_items").delete().eq("id", item.id);
    if (!error) {
      setItems((prev) => (prev ?? []).filter((i) => i.id !== item.id));
    }
  }

  if (items === null) {
    return null;
  }

  // label'a göre grupla; boş/whitespace olanlar "Diğer" ortak şeridine
  // düşer ve her koşulda en sonda gösterilir.
  const groups = new Map<string, WardrobeItem[]>();
  for (const item of items) {
    const key = normalizeWardrobeLabel(item.label);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  const orderedLabels = [...groups.keys()]
    .filter((l) => l !== WARDROBE_OTHER_LABEL)
    .concat(groups.has(WARDROBE_OTHER_LABEL) ? [WARDROBE_OTHER_LABEL] : []);

  return (
    <section id="dolabim" className="border border-neutral-200 bg-surface p-6 md:p-8 scroll-mt-24">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-2">Kişisel</p>
          <h2 className="font-serif italic text-3xl text-ink">Dolabım</h2>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 bg-ink text-paper text-xs uppercase tracking-widest font-medium px-5 py-2.5 transition-colors hover:bg-accent shrink-0"
        >
          <Plus size={14} strokeWidth={2} />
          Parça Ekle
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 gap-3">
          <p className="font-serif italic text-xl text-ink">Dolabın henüz boş.</p>
          <p className="text-sm text-gray-500">İlk parçanı ekleyerek başla!</p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-2 inline-flex items-center gap-1.5 bg-ink text-paper text-xs uppercase tracking-widest font-medium px-6 py-3 transition-colors hover:bg-accent"
          >
            <Plus size={14} strokeWidth={2} />
            Parça Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {orderedLabels.map((label) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">{label}</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {groups.get(label)!.map((item) => {
                  const revealed = revealedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="group relative w-24 shrink-0"
                      onClick={() => setRevealedId(revealed ? null : item.id)}
                    >
                      <div className="relative aspect-square w-24 overflow-hidden border border-neutral-200 bg-neutral-50">
                        <Image
                          src={item.image_url}
                          alt={item.label ?? "Dolap parçası"}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                        {item.category && (
                          <span className="absolute bottom-1 left-1 bg-paper/90 text-ink text-[9px] uppercase tracking-wide px-1.5 py-0.5">
                            {getCategoryLabel(item.category)}
                          </span>
                        )}
                        <div
                          className={`absolute inset-0 flex items-center justify-center gap-2 bg-ink/50 transition-opacity duration-200 ${
                            revealed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                            aria-label="Düzenle"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink hover:text-accent transition-colors"
                          >
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item);
                            }}
                            aria-label="Sil"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-paper text-ink hover:text-accent transition-colors"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <AddWardrobeItemModal
          user={user}
          editingItem={editingItem}
          onClose={() => {
            setModalOpen(false);
            setEditingItem(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </section>
  );
}
