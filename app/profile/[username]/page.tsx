import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import { supabase } from "../../utils/supabase";
import EditProfileButton from "./EditProfileButton";

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
            <h1 className="text-xl font-bold tracking-tight">{profile.username}</h1>
            {profile.bio && (
              <p className="text-gray-500 text-sm mt-1">{profile.bio}</p>
            )}
          </div>

          <EditProfileButton profileId={profile.id} />
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-16">
            Bu kullanıcının henüz ilanı yok.
          </p>
        )}
      </div>
    </main>
  );
}
