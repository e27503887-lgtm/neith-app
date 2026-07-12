import Link from "next/link";
import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import ProductGallery from "../../product/[id]/ProductGallery";
import BrandBadge from "../../components/BrandBadge";
import OutfitActions from "./OutfitActions";
import OutfitLikeButton from "../../components/OutfitLikeButton";
import ReportTrigger from "../../components/ReportTrigger";
import EloTierBadge from "../../components/EloTierBadge";
import { getEraLabel } from "@/lib/eras";
import { supabase } from "../../utils/supabase";
import { fetchPhotoTagsByMedia } from "@/lib/photoTags";

type Props = {
  params: Promise<{ id: string }>;
};

type ProductRow = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
};

export default async function OutfitDetailPage({ params }: Props) {
  const { id } = await params;

  const { data: outfit } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .single();

  if (!outfit) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Kombin bulunamadı.</p>
      </main>
    );
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("username, avatar_url, account_type")
    .eq("id", outfit.user_id)
    .single();

  const { data: mediaRows } = await supabase
    .from("outfit_media")
    .select("id, media_url, media_type")
    .eq("outfit_id", id)
    .order("position", { ascending: true });

  const tagsByMediaId = await fetchPhotoTagsByMedia(
    "outfit",
    (mediaRows ?? []).map((m) => m.id)
  );

  const media =
    mediaRows && mediaRows.length > 0
      ? mediaRows.map((m) => ({ ...m, tags: tagsByMediaId.get(m.id) ?? [] }))
      : [{ media_url: outfit.image_url, media_type: "image" as const }];

  const { data: items } = await supabase
    .from("outfit_items")
    .select("product_id, custom_image_url, custom_label")
    .eq("outfit_id", id);

  const productIds = (items ?? [])
    .map((i) => i.product_id)
    .filter((productId): productId is number | string => productId !== null);

  const customPieces = (items ?? []).filter(
    (i) => i.product_id === null && i.custom_image_url
  );

  const { data: products } = productIds.length
    ? await supabase.from("products").select("*").in("id", productIds)
    : { data: [] as ProductRow[] };

  const usernames = [...new Set((products ?? []).map((p) => p.username))];
  const { data: profiles } = usernames.length
    ? await supabase
        .from("profiles")
        .select("username, avatar_url, account_type")
        .in("username", usernames)
    : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));

  const { data: commentRows } = productIds.length
    ? await supabase.from("comments").select("product_id").in("product_id", productIds)
    : { data: [] as { product_id: number | string }[] };

  const commentCountByProduct = new Map<number | string, number>();
  (commentRows ?? []).forEach((c) => {
    commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
  });

  const enrichedProducts = (products ?? []).map((p) => ({
    ...p,
    avatar_url: profileByUsername.get(p.username)?.avatar_url ?? null,
    account_type: profileByUsername.get(p.username)?.account_type ?? null,
    comment_count: commentCountByProduct.get(p.id) ?? 0,
  }));

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-surface border border-neutral-200 p-6 md:p-10 flex flex-col md:flex-row gap-8">
          <ProductGallery media={media} title={outfit.title} />

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{outfit.title}</h1>
                <EloTierBadge eloRating={outfit.elo_rating} />
              </div>
              {outfit.description && (
                <p className="text-gray-600 mt-2">{outfit.description}</p>
              )}
              {outfit.era && (
                <Link
                  href={`/era/${outfit.era}`}
                  className="inline-block mt-3 text-xs uppercase tracking-wide text-gray-600 border border-neutral-300 px-2 py-0.5 hover:border-accent hover:text-accent transition-colors"
                >
                  {getEraLabel(outfit.era)}
                </Link>
              )}
            </div>

            <Link
              href={`/profile/${owner?.username ?? ""}`}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-accent transition-colors w-fit"
            >
              @{owner?.username ?? "Bilinmeyen kullanıcı"}
              {owner?.account_type === "brand" && <BrandBadge />}
            </Link>

            <OutfitActions outfitId={outfit.id} ownerId={outfit.user_id} />
            <div className="mt-2 flex items-center gap-4">
              <OutfitLikeButton outfitId={outfit.id} />
              <ReportTrigger targetType="outfit" targetId={outfit.id} />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-neutral-200 p-6 md:p-10">
          <h3 className="section-label mb-4">
            Bu Kombindeki Parçalar
          </h3>

          {enrichedProducts.length === 0 && customPieces.length === 0 ? (
            <p className="text-gray-500 text-sm">Bu kombine henüz parça eklenmemiş.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrichedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}

              {customPieces.map((c, index) => (
                <div
                  key={`custom-${index}`}
                  className="bg-surface border border-neutral-200 overflow-hidden"
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-100">
                    <Image
                      src={c.custom_image_url!}
                      alt={c.custom_label ?? "Satılık olmayan parça"}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-ink/80 text-paper text-[10px] uppercase tracking-wide px-2 py-1">
                      Satılık Değil
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-gray-600">{c.custom_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
