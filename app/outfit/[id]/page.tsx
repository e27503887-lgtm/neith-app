import Link from "next/link";
import Image from "next/image";
import ProductCard from "../../components/ProductCard";
import BrandBadge from "../../components/BrandBadge";
import OutfitActions from "./OutfitActions";
import { getEraLabel } from "@/lib/eras";
import { supabase } from "../../utils/supabase";

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

  const { data: items } = await supabase
    .from("outfit_items")
    .select("product_id")
    .eq("outfit_id", id);

  const productIds = (items ?? []).map((i) => i.product_id);

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
        <div className="bg-paper border border-neutral-200 p-6 md:p-10 flex flex-col md:flex-row gap-8">
          <div className="relative w-full md:w-1/2 aspect-square">
            <Image
              src={outfit.image_url}
              alt={outfit.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover rounded-lg"
            />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{outfit.title}</h1>
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
          </div>
        </div>

        <div className="bg-paper border border-neutral-200 p-6 md:p-10">
          <h3 className="section-label mb-4">
            Bu Kombindeki Parçalar
          </h3>

          {enrichedProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrichedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Bu kombine henüz parça eklenmemiş.</p>
          )}
        </div>
      </div>
    </main>
  );
}
