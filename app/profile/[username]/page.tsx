import FollowButton from "../../components/FollowButton";
import { supabase } from "../../utils/supabase";
import UserProfileCard from "../../components/UserProfileCard";
import ProfileReviews from "../../components/ProfileReviews";
import ProfileMenu from "../../components/ProfileMenu";
import EditorialHub from "../../components/EditorialHub";
import StyleTags from "../../components/StyleTags";
import ProfileTabs from "../../components/ProfileTabs";
import AdminPanelLink from "../../components/AdminPanelLink";
import BrandProfileHeader from "../../components/BrandProfileHeader";
import ProductShelf from "../../components/ProductShelf";
import OutfitShelf from "../../components/OutfitShelf";
import PostShelf from "../../components/PostShelf";
import { CATEGORIES } from "@/lib/categories";
import { enrichPostsWithMedia } from "@/lib/posts";

// Bu sayfa dinamik API kullanmadığı için Next.js onu build/ilk istekte
// statik olarak prerender edip cache'leyebiliyordu (aynı kök neden daha
// önce /outfits'te bulunup düzeltilmişti). profiles satırı hesap
// oluşturma sonrası CLIENT tarafında (LoginForm.tsx) eklendiği için, bir
// kullanıcının profiline ilk ziyaret bu satır henüz yazılmadan (ör.
// signup'ın hemen ardından, ya da botlar/önbellek ısıtma sırasında)
// gerçekleşirse "Kullanıcı bulunamadı" HTML'i o path için KALICI olarak
// önbelleğe yazılıyor ve profil gerçekten var olsa bile bir sonraki
// deploy'a kadar herkese (kullanıcının kendisi dahil) o hatalı sayfa
// gösteriliyordu. force-dynamic bunu önler, her istekte taze veri çeker.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "*, style_tags, size_top, size_bottom, size_shoe, show_sizes, show_wardrobe_value"
    )
    .eq("username", username)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Kullanıcı bulunamadı.</p>
      </main>
    );
  }

  const { data: badgeRows } = await supabase
    .from("badges")
    .select("badge_key")
    .eq("user_id", profile.id);

  const badgeKeys = (badgeRows ?? []).map((b) => b.badge_key);

  const { data: products } = await supabase
    .from("products")
    .select("id, price, title, image_url, category")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const wardrobeValue = (products ?? []).reduce(
    (sum, product) => sum + (product.price ?? 0),
    0
  );

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

  const { data: postsRaw } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const enrichedPosts = await enrichPostsWithMedia(postsRaw ?? []);

  const postsForGrid = enrichedPosts.map((p) => ({
    id: p.id,
    cover_url: p.cover_url,
    cover_type: p.cover_type,
    media_count: p.media_count,
    like_count: p.like_count,
  }));

  const productsForGrid = (products ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    image_url: p.image_url,
  }));

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  if (profile.account_type === "brand") {
    const joinedLabel = new Date(profile.created_at).toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
    });

    const productsByCategory = new Map<string, NonNullable<typeof products>>();
    (products ?? []).forEach((p) => {
      const key = p.category ?? "diger";
      const list = productsByCategory.get(key) ?? [];
      list.push(p);
      productsByCategory.set(key, list);
    });

    const toShelfProduct = (p: NonNullable<typeof products>[number]) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      image_url: p.image_url,
      username: profile.username,
      avatar_url: profile.avatar_url,
      comment_count: commentCountByProduct.get(p.id) ?? 0,
      account_type: profile.account_type,
    });

    return (
      <main className="min-h-screen bg-paper pt-24 pb-12">
        <BrandProfileHeader
          userId={profile.id}
          username={profile.username}
          avatar_url={profile.avatar_url}
          banner_url={profile.banner_url}
          bio={profile.bio}
          productCount={products?.length ?? 0}
          followerCount={followerCount ?? 0}
          joinedLabel={joinedLabel}
          badgeKeys={badgeKeys}
          wardrobeValue={wardrobeValue}
          showWardrobeValue={profile.show_wardrobe_value ?? true}
        />

        <div className="max-w-6xl mx-auto px-6 md:px-10">
          {CATEGORIES.map((c) => (
            <ProductShelf
              key={c.value}
              title={c.label}
              products={(productsByCategory.get(c.value) ?? []).map(toShelfProduct)}
            />
          ))}

          <OutfitShelf
            outfits={(outfits ?? []).map((o) => ({
              id: o.id,
              title: o.title,
              image_url: o.image_url,
            }))}
          />

          <PostShelf posts={postsForGrid} />
        </div>
      </main>
    );
  }

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
            badgeKeys={badgeKeys}
            followerCount={followerCount ?? 0}
            followingCount={followingCount ?? 0}
            sizeTop={profile.size_top ?? null}
            sizeBottom={profile.size_bottom ?? null}
            sizeShoe={profile.size_shoe ?? null}
            styleTags={profile.style_tags ?? []}
            showSizes={profile.show_sizes ?? true}
            wardrobeValue={wardrobeValue}
            showWardrobeValue={profile.show_wardrobe_value ?? true}
            outfits={
              outfits?.map((outfit) => ({
                id: outfit.id,
                title: outfit.title,
                image_url: outfit.image_url,
              })) ?? []
            }
          />

          <ProfileReviews userId={profile.id} />

          <section id="outfits" className="bg-surface border border-neutral-200 p-6 scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="section-label">Tarz Defteri</p>
                <h2 className="mt-2 font-serif text-2xl text-ink">Paylaşımlar</h2>
              </div>
              <div className="flex items-center gap-2">
                <FollowButton targetUserId={profile.id} />
                <ProfileMenu targetUserId={profile.id} />
              </div>
            </div>

            <ProfileTabs
              profileId={profile.id}
              products={productsForGrid}
              outfits={wardrobeOutfits}
              posts={postsForGrid}
            />
          </section>
        </div>

        <EditorialHub />
      </div>
    </main>
  );
}
