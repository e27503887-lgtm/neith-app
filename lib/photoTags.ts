import { supabase } from "../app/utils/supabase";

const MEDIA_COLUMNS = {
  outfit: "outfit_media_id",
  post: "post_media_id",
} as const;

type MediaKind = keyof typeof MEDIA_COLUMNS;

export type PhotoTag = {
  id: number | string;
  x_percent: number;
  y_percent: number;
  product_id: number | string;
  title: string;
  price: number;
  image_url: string;
};

export async function fetchPhotoTagsByMedia(
  kind: MediaKind,
  mediaIds: (number | string)[]
): Promise<Map<number | string, PhotoTag[]>> {
  const column = MEDIA_COLUMNS[kind];
  if (mediaIds.length === 0) return new Map();

  const { data: tagRows } = await supabase
    .from("photo_tags")
    .select("id, outfit_media_id, post_media_id, product_id, x_percent, y_percent")
    .in(column, mediaIds);

  const productIds = [...new Set((tagRows ?? []).map((t) => t.product_id))];
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, title, price, image_url").in("id", productIds)
    : { data: [] as { id: number | string; title: string; price: number; image_url: string }[] };

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const map = new Map<number | string, PhotoTag[]>();

  (tagRows ?? []).forEach((t) => {
    const product = productById.get(t.product_id);
    if (!product) return;

    const mediaId = kind === "outfit" ? t.outfit_media_id : t.post_media_id;
    if (mediaId === null) return;

    const list = map.get(mediaId) ?? [];
    list.push({
      id: t.id,
      x_percent: t.x_percent,
      y_percent: t.y_percent,
      product_id: t.product_id,
      title: product.title,
      price: product.price,
      image_url: product.image_url,
    });
    map.set(mediaId, list);
  });

  return map;
}

export async function getTaggedMediaIds(
  kind: MediaKind,
  mediaIds: (number | string)[]
): Promise<Set<number | string>> {
  const column = MEDIA_COLUMNS[kind];
  if (mediaIds.length === 0) return new Set();

  const { data } = await supabase
    .from("photo_tags")
    .select("outfit_media_id, post_media_id")
    .in(column, mediaIds);

  const ids = (data ?? [])
    .map((r) => (kind === "outfit" ? r.outfit_media_id : r.post_media_id))
    .filter((id): id is number | string => id !== null);

  return new Set(ids);
}

export async function getOutfitCoverTagFlags(
  outfitIds: (number | string)[]
): Promise<Map<number | string, boolean>> {
  if (outfitIds.length === 0) return new Map();

  const { data: coverMedia } = await supabase
    .from("outfit_media")
    .select("id, outfit_id")
    .in("outfit_id", outfitIds)
    .eq("position", 0);

  const mediaIds = (coverMedia ?? []).map((m) => m.id);
  const tagged = await getTaggedMediaIds("outfit", mediaIds);

  const map = new Map<number | string, boolean>();
  (coverMedia ?? []).forEach((m) => map.set(m.outfit_id, tagged.has(m.id)));
  return map;
}
