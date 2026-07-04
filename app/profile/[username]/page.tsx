import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import OutfitCard from "../../components/OutfitCard";
import BrandBadge from "../../components/BrandBadge";
import FollowButton from "../../components/FollowButton";
import FollowStats from "../../components/FollowStats";
import { supabase } from "../../utils/supabase";
import EditProfileButton from "./EditProfileButton";
import StartChatButton from "../../components/StartChatButton";

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
      <main className="min-h-screen bg-[#FAFAFA] pt-24 px-6 flex items-center justify-center">
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

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white border border-gray-100 rounded-xl p-6 flex items-center gap-4 mb-8">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={64}
              height={64}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
              {profile.username?.[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-1.5">
                {profile.username}
                {profile.account_type === "brand" && <BrandBadge />}
              </h1>
              <FollowButton targetUserId={profile.id} />
            </div>
            <FollowStats
              userId={profile.id}
              followerCount={followerCount ?? 0}
              followingCount={followingCount ?? 0}
            />
            {profile.bio && (
              <p className="text-gray-500 text-sm mt-1">{profile.bio}</p>
            )}
            {profile.account_type === "brand" && (
              <p className="text-gray-400 text-xs mt-1">Resmi Marka Hesabı</p>
            )}
          </div>

          <EditProfileButton profileId={profile.id} />
          <StartChatButton otherUserId={profile.id} />
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={{
                  ...product,
                  avatar_url: profile.avatar_url,
                  account_type: profile.account_type,
                  comment_count: commentCountByProduct.get(product.id) ?? 0,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-16">
            Bu kullanıcının henüz ilanı yok.
          </p>
        )}

        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Kombinler</h2>

          {outfits && outfits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {outfits.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={{
                    ...outfit,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                    account_type: profile.account_type,
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Henüz kombin paylaşılmamış.</p>
          )}
        </div>
      </div>
    </main>
  );
}
