import OutfitRecommendations from "../components/OutfitRecommendations";
import OutfitsFeed from "../components/OutfitsFeed";
import { supabase } from "../utils/supabase";
import { getOutfitCoverTagFlags } from "@/lib/photoTags";

export default async function OutfitsPage() {
  const { data: outfits } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false });

  const userIds = [...new Set((outfits ?? []).map((o) => o.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", userIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const tagFlags = await getOutfitCoverTagFlags((outfits ?? []).map((o) => o.id));

  const enriched = (outfits ?? []).map((o) => ({
    ...o,
    id: o.id,
    title: o.title,
    image_url: o.image_url,
    style_tag: o.style_tag ?? null,
    username: profileById.get(o.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
    account_type: profileById.get(o.user_id)?.account_type ?? null,
    has_tag: tagFlags.get(o.id) ?? false,
  }));

  const featured = enriched.filter((o) => o.is_featured).slice(0, 6);
  const community = enriched.filter((o) => o.creator_type === "user").slice(0, 6);
  const brand = enriched.filter((o) => o.creator_type === "brand").slice(0, 6);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <OutfitRecommendations featured={featured} community={community} brand={brand} />

        <div className="mb-8 border-b border-neutral-200 pb-6">
          <p className="section-label mb-2">Topluluk</p>
          <h1 className="font-serif text-3xl text-ink tracking-tight">Kombin Akışı</h1>
        </div>

        <OutfitsFeed outfits={enriched} />
      </div>
    </main>
  );
}
