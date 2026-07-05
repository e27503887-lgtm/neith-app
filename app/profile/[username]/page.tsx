import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import BrandBadge from "../../components/BrandBadge";
import FollowButton from "../../components/FollowButton";
import { supabase } from "../../utils/supabase";
import StartChatButton from "../../components/StartChatButton";
import UserProfileCard from "../../components/UserProfileCard";
import EditorialHub from "../../components/EditorialHub";
import StyleTags from "../../components/StyleTags";
import WardrobeGrid from "../../components/WardrobeGrid";
import AdminPanelLink from "../../components/AdminPanelLink";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Kullanıcı bulunamadı.</p>
      </main>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const productIds = (products ?? []).map((p) => p.id);
  const { data: commentRows } = productIds.length
    ? await supabase.from("comments").select("product_id").in("product_id", productIds)
    : { data: [] as { product_id: number | string }[] };

  const commentCountByProduct = new Map<number | string, number>();
  (commentRows ?? []).forEach((c) => {
    commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
  });

  const { data: outfits } = await supabase
    .from("outfits")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const outfitIds = (outfits ?? []).map((o) => o.id);
  const { data: outfitLikeRows } = outfitIds.length
    ? await supabase.from("outfit_likes").select("outfit_id").in("outfit_id", outfitIds)
    : { data: [] as { outfit_id: number | string }[] };

  const likeCountByOutfit = new Map<number | string, number>();
  (outfitLikeRows ?? []).forEach((l) => {
    likeCountByOutfit.set(l.outfit_id, (likeCountByOutfit.get(l.outfit_id) ?? 0) + 1);
  });

  const wardrobeOutfits = (outfits ?? []).map((o) => ({
    id: o.id,
    title: o.title,
    image_url: o.image_url,
    like_count: likeCountByOutfit.get(o.id) ?? 0,
    is_highlighted: o.is_highlighted ?? false,
  }));

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="section-label">Moda Kimliği</p>
              <AdminPanelLink profileId={profile.id} isAdmin={!!profile.is_admin} />
            </div>
            <StyleTags profileId={profile.id} initialTags={profile.style_tags ?? []} />
          </div>

          <UserProfileCard
            userId={profile.id}
            username={profile.username}
            avatar_url={profile.avatar_url}
            bio={profile.bio}
            account_type={profile.account_type}
            followerCount={followerCount ?? 0}
            followingCount={followingCount ?? 0}
            outfits={
              outfits?.map((outfit) => ({
                id: outfit.id,
                title: outfit.title,
                image_url: outfit.image_url,
              })) ?? []
            }
          />

          <section id="outfits" className="bg-paper border border-neutral-200 p-6 scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="section-label">Tarz Defteri</p>
                <h2 className="mt-2 font-serif text-2xl text-ink">Kullanıcının Kombinleri</h2>
              </div>
              <FollowButton targetUserId={profile.id} />
            </div>

            <WardrobeGrid profileId={profile.id} outfits={wardrobeOutfits} />
          </section>
        </div>

        <EditorialHub />
      </div>
    </main>
  );
}
