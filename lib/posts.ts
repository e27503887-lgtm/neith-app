import { supabase } from "../app/utils/supabase";

export type PostRow = {
  id: number | string;
  user_id: string;
  caption: string | null;
  created_at: string;
};

export type PostMediaItem = {
  url: string;
  type: "image" | "video";
};

export type EnrichedPost = PostRow & {
  cover_url: string;
  cover_type: "image" | "video";
  cover_media_id: number | string | null;
  media: PostMediaItem[];
  media_count: number;
  like_count: number;
};

export async function enrichPostsWithMedia<T extends PostRow>(
  posts: T[],
  options?: { includeLikes?: boolean }
): Promise<
  (T & {
    cover_url: string;
    cover_type: "image" | "video";
    cover_media_id: number | string | null;
    media: PostMediaItem[];
    media_count: number;
    like_count: number;
  })[]
> {
  const postIds = posts.map((p) => p.id);
  if (postIds.length === 0) return [];

  const includeLikes = options?.includeLikes ?? true;

  const [{ data: mediaRows }, { data: likeRows }] = await Promise.all([
    supabase
      .from("post_media")
      .select("id, post_id, media_url, media_type, position")
      .in("post_id", postIds)
      .order("position", { ascending: true }),
    includeLikes
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: number | string }[] }),
  ]);

  const firstMediaByPost = new Map<
    number | string,
    { id: number | string; media_url: string; media_type: "image" | "video" }
  >();
  const mediaByPost = new Map<number | string, PostMediaItem[]>();

  (mediaRows ?? []).forEach((m) => {
    const list = mediaByPost.get(m.post_id) ?? [];
    list.push({ url: m.media_url, type: m.media_type });
    mediaByPost.set(m.post_id, list);
    if (!firstMediaByPost.has(m.post_id)) {
      firstMediaByPost.set(m.post_id, { id: m.id, media_url: m.media_url, media_type: m.media_type });
    }
  });

  const likeCountByPost = new Map<number | string, number>();
  (likeRows ?? []).forEach((l) => {
    likeCountByPost.set(l.post_id, (likeCountByPost.get(l.post_id) ?? 0) + 1);
  });

  return posts.map((p) => ({
    ...p,
    cover_url: firstMediaByPost.get(p.id)?.media_url ?? "",
    cover_type: firstMediaByPost.get(p.id)?.media_type ?? "image",
    cover_media_id: firstMediaByPost.get(p.id)?.id ?? null,
    media: mediaByPost.get(p.id) ?? [],
    media_count: mediaByPost.get(p.id)?.length ?? 0,
    like_count: likeCountByPost.get(p.id) ?? 0,
  }));
}
