import ProductGallery from "../../product/[id]/ProductGallery";
import BrandBadge from "../../components/BrandBadge";
import PostActions from "./PostActions";
import PostLikeButton from "../../components/PostLikeButton";
import { supabase } from "../../utils/supabase";
import { fetchPhotoTagsByMedia } from "@/lib/photoTags";
import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-paper border border-neutral-200 p-6 md:p-10 flex flex-col md:flex-row gap-8">
          {media.length > 0 && <ProductGallery media={media} title={post.caption ?? "Gönderi"} />}

          <div className="flex-1 flex flex-col gap-4">
            <Link
              href={`/profile/${owner?.username ?? ""}`}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors w-fit"
            >
              @{owner?.username ?? "Bilinmeyen kullanıcı"}
              {owner?.account_type === "brand" && <BrandBadge />}
            </Link>

            {post.caption && <p className="text-gray-700 whitespace-pre-wrap">{post.caption}</p>}

            <PostLikeButton postId={post.id} />

            <PostActions postId={post.id} ownerId={post.user_id} />
          </div>
        </div>
      </div>
    </main>
  );
}
