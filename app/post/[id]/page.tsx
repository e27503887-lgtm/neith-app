import Link from "next/link";
import Image from "next/image";
import ProductGallery from "../../product/[id]/ProductGallery";
import BrandBadge from "../../components/BrandBadge";
import PostMenu from "../../components/PostMenu";
import PostActionBar from "../../components/PostActionBar";
import { supabase } from "../../utils/supabase";
import { fetchPhotoTagsByMedia } from "@/lib/photoTags";
import { timeAgo } from "@/lib/relativeTime";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params;

  const { data: post } = await supabase.from("posts").select("*").eq("id", id).single();

  if (!post) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Gönderi bulunamadı.</p>
      </main>
    );
  }

  const { data: owner } = await supabase
    .from("profiles")
    .select("username, avatar_url, account_type")
    .eq("id", post.user_id)
    .single();

  const { data: mediaRows } = await supabase
    .from("post_media")
    .select("id, media_url, media_type")
    .eq("post_id", id)
    .order("position", { ascending: true });

  const tagsByMediaId = await fetchPhotoTagsByMedia(
    "post",
    (mediaRows ?? []).map((m) => m.id)
  );

  const media = (mediaRows ?? []).map((m) => ({ ...m, tags: tagsByMediaId.get(m.id) ?? [] }));
  const username = owner?.username ?? "Bilinmeyen kullanıcı";

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-4 md:px-6">
      <div className="max-w-2xl mx-auto border-b border-neutral-200 pb-4">
        <div className="flex items-start gap-3">
          <Link href={`/profile/${username}`} className="shrink-0">
            {owner?.avatar_url ? (
              <Image
                src={owner.avatar_url}
                alt={username}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-neutral-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 border border-neutral-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                {username?.[0]?.toUpperCase()}
              </div>
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              href={`/profile/${username}`}
              className="flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <span className="truncate text-sm font-medium text-ink">{username}</span>
              {owner?.account_type === "brand" && <BrandBadge />}
            </Link>
            <p className="text-xs text-gray-500">{timeAgo(post.created_at)}</p>
          </div>

          <PostMenu postId={post.id} ownerId={post.user_id} redirectAfterDelete="/" />
        </div>

        {post.caption && (
          <p className="mt-3 text-[17px] leading-relaxed text-ink whitespace-pre-wrap">
            {post.caption}
          </p>
        )}

        {media.length > 0 && (
          <div className="mt-4">
            <ProductGallery media={media} title={post.caption ?? "Gönderi"} />
          </div>
        )}

        <PostActionBar postId={post.id} />
      </div>
    </main>
  );
}
