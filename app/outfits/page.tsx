import { Suspense } from "react";
import OutfitRecommendations from "../components/OutfitRecommendations";
import OutfitsFeed from "../components/OutfitsFeed";
import ScrollTopButton from "../components/ScrollTopButton";
import OutfitOfTheDayCard from "../components/OutfitOfTheDayCard";
import { supabase } from "../utils/supabase";
import { getOutfitCoverTagFlags } from "@/lib/photoTags";
import { FRESH_WINDOW_MS } from "@/lib/feed-mixer";

export type OutfitPiece = { id: number | string; image_url: string };

// Kombinlerdeki satılık parçalar: outfit_items.product_id + kombin
// fotoğraflarındaki photo_tags birleşimi. Satılmış ürünler sayılmaz.
async function fetchPiecesByOutfit(outfitIds: (number | string)[]) {
  const empty = new Map<number | string, OutfitPiece[]>();
  if (outfitIds.length === 0) return empty;

  const [{ data: items }, { data: media }] = await Promise.all([
    supabase
      .from("outfit_items")
      .select("outfit_id, product_id")
      .in("outfit_id", outfitIds)
      .not("product_id", "is", null),
    supabase.from("outfit_media").select("id, outfit_id").in("outfit_id", outfitIds),
  ]);

  const mediaIds = (media ?? []).map((m) => m.id);
  const outfitByMediaId = new Map((media ?? []).map((m) => [m.id, m.outfit_id]));

  const { data: tags } = mediaIds.length
    ? await supabase
        .from("photo_tags")
        .select("outfit_media_id, product_id")
        .in("outfit_media_id", mediaIds)
    : { data: [] as { outfit_media_id: number | string; product_id: number | string }[] };

  // kombin → benzersiz ürün kimlikleri
  const productIdsByOutfit = new Map<number | string, Set<number | string>>();
  const collect = (outfitId: number | string | undefined, productId: number | string | null) => {
    if (outfitId === undefined || productId === null) return;
    const set = productIdsByOutfit.get(outfitId) ?? new Set();
    set.add(productId);
    productIdsByOutfit.set(outfitId, set);
  };
  (items ?? []).forEach((i) => collect(i.outfit_id, i.product_id));
  (tags ?? []).forEach((t) => collect(outfitByMediaId.get(t.outfit_media_id), t.product_id));

  const allProductIds = [...new Set([...productIdsByOutfit.values()].flatMap((s) => [...s]))];
  const { data: products } = allProductIds.length
    ? await supabase
        .from("products")
        .select("id, image_url, is_sold")
        .in("id", allProductIds)
        .or("is_sold.is.null,is_sold.eq.false")
    : { data: [] as { id: number | string; image_url: string; is_sold: boolean | null }[] };

  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  const result = empty;
  for (const [outfitId, productIds] of productIdsByOutfit) {
    const pieces = [...productIds]
      .map((id) => productById.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ id: p.id, image_url: p.image_url }));
    if (pieces.length > 0) result.set(outfitId, pieces);
  }
  return result;
}

export default async function OutfitsPage() {
  const [{ data: outfits }, { data: ootdRows }] = await Promise.all([
    supabase.from("outfits").select("*").order("created_at", { ascending: false }),
    supabase.from("outfit_of_the_day").select("*").limit(1),
  ]);
  const ootdRaw = ootdRows?.[0] ?? null;

  const userIds = [...new Set((outfits ?? []).map((o) => o.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", userIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const outfitIds = (outfits ?? []).map((o) => o.id);
  const [tagFlags, piecesByOutfit] = await Promise.all([
    getOutfitCoverTagFlags(outfitIds),
    fetchPiecesByOutfit(outfitIds),
  ]);

  // Hibrit kota için yalnızca son 24 saatin kombinlerine beğeni sayısı
  // gerekir — sorgu o küçük kümeyle sınırlı tutulur.
  const freshCutoff = new Date(Date.now() - FRESH_WINDOW_MS).toISOString();
  const freshIds = (outfits ?? [])
    .filter((o) => o.created_at >= freshCutoff)
    .map((o) => o.id);
  const { data: freshLikes } = freshIds.length
    ? await supabase.from("outfit_likes").select("outfit_id").in("outfit_id", freshIds)
    : { data: [] as { outfit_id: number | string }[] };

  const likeCountById = new Map<number | string, number>();
  (freshLikes ?? []).forEach((row) => {
    likeCountById.set(row.outfit_id, (likeCountById.get(row.outfit_id) ?? 0) + 1);
  });

  const enriched = (outfits ?? []).map((o) => ({
    ...o,
    id: o.id,
    title: o.title,
    image_url: o.image_url,
    style_tag: o.style_tag ?? null,
    era: o.era ?? null,
    created_at: o.created_at,
    like_count: likeCountById.get(o.id) ?? 0,
    pieces: piecesByOutfit.get(o.id) ?? [],
    username: profileById.get(o.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(o.user_id)?.avatar_url ?? null,
    account_type: profileById.get(o.user_id)?.account_type ?? null,
    has_tag: tagFlags.get(o.id) ?? false,
  }));

  // View boş dönerse (bugün hiç beğeni yoksa) kart hiç görünmez.
  const outfitOfTheDay =
    ootdRaw && ootdRaw.id && ootdRaw.image_url
      ? {
          id: ootdRaw.id,
          title: ootdRaw.title ?? "",
          image_url: ootdRaw.image_url,
          username: profileById.get(ootdRaw.user_id)?.username ?? "Bilinmeyen kullanıcı",
          like_count: ootdRaw.like_count ?? 0,
          style_tag: ootdRaw.style_tag ?? null,
        }
      : null;

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

        {outfitOfTheDay && <OutfitOfTheDayCard outfit={outfitOfTheDay} />}

        <Suspense fallback={null}>
          <OutfitsFeed outfits={enriched} />
        </Suspense>
      </div>

      <ScrollTopButton />
    </main>
  );
}
