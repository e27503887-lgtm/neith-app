"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "../utils/supabase";
import { STYLE_TAGS } from "@/lib/styles";

export default function StyleTags({
  profileId,
  initialTags,
}: {
  profileId: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isOwner, setIsOwner] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(initialTags);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.id === profileId);
    });
  }, [profileId]);

  function toggleDraftTag(tag: string) {
    setDraft((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ style_tags: draft })
      .eq("id", profileId);
    setSaving(false);
    if (!error) {
      setTags(draft);
      setEditing(false);
    }
  }

  if (tags.length === 0 && !isOwner) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!editing &&
        tags.map((tag) => (
          <span
            key={tag}
            className="border border-ink text-ink text-[11px] uppercase tracking-[0.16em] px-3 py-1"
          >
            {tag}
          </span>
        ))}

      {!editing && tags.length === 0 && isOwner && (
        <span className="text-xs text-gray-500">Henüz moda kimliği seçilmedi.</span>
      )}

      {isOwner && !editing && (
        <button
          onClick={() => {
            setDraft(tags);
            setEditing(true);
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-accent transition-colors"
        >
          <Pencil size={12} />
          Düzenle
        </button>
      )}

      {editing && (
        <div className="w-full border border-neutral-200 bg-surface p-4 mt-1">
          <div className="flex flex-wrap gap-2 mb-4">
            {STYLE_TAGS.map((tag) => {
              const selected = draft.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleDraftTag(tag)}
                  className={`text-[11px] uppercase tracking-[0.16em] px-3 py-1 border transition-colors ${
                    selected
                      ? "bg-ink text-paper border-ink"
                      : "border-neutral-300 text-gray-600 hover:border-ink"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-500 hover:text-ink transition-colors"
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
