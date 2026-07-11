import Link from "next/link";
import { getEraLabel } from "@/lib/eras";
import { getCategoryLabel } from "@/lib/categories";
import { supabase } from "../../utils/supabase";
import LikeButton from "../../components/LikeButton";
import SaveButton from "../../components/SaveButton";
import StartChatButton from "../../components/StartChatButton";
import CommentSection from "../../components/CommentSection";
import ProductActions from "./ProductActions";
import ProductGallery from "./ProductGallery";
import CompleteTheLook from "../../components/CompleteTheLook";
import SocialProofLine from "../../components/SocialProofLine";
import ReportTrigger from "../../components/ReportTrigger";
import type { EngineProduct } from "@/lib/outfit-engine";
import { formatSustainabilityLine, getSustainabilityEstimate } from "@/lib/sustainability";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (!product) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">İlan bulunamadı.</p>
      </main>
    );
  }

  const { data: mediaRows } = await supabase
    .from("product_media")
    .select("media_url, media_type")
    .eq("product_id", id)
    .order("position", { ascending: true });

  const media =
    mediaRows && mediaRows.length > 0
      ? mediaRows
      : [{ media_url: product.image_url, media_type: "image" as const }];

  const isBrand = product.seller_type === "brand";
  // Rozet yalnızca ikinci el (kullanıcı) ilanlarında — sıfır/marka ürünlerde
  // "tasarruf" iddiası yanıltıcı olurdu.
  const sustainability = isBrand ? null : getSustainabilityEstimate(product.category);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {product.is_sold && (
          <div className="bg-ink text-paper px-6 py-3">
            <p className="text-xs uppercase tracking-[0.24em]">
              Satıldı — bu parça yeni sahibini buldu
            </p>
          </div>
        )}

        <div className="bg-surface border border-neutral-200 p-6 md:p-10 flex flex-col md:flex-row gap-8">
          <ProductGallery media={media} title={product.title} />

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="font-semibold text-2xl text-ink">
                  {product.price.toLocaleString("tr-TR")} ₺
                </p>
                {isBrand && (
                  <span className="text-xs uppercase tracking-wide text-accent border border-accent px-2 py-0.5">
                    Sabit Fiyat
                  </span>
                )}
              </div>
              {sustainability && (
                <p className="mt-2 text-xs text-accent leading-5">
                  <span className="mr-1">♻</span>
                  {formatSustainabilityLine(sustainability)}
                </p>
              )}
              <SocialProofLine productId={product.id} />
              {product.description && (
                <p className="text-gray-600 text-sm mt-3 whitespace-pre-line">
                  {product.description}
                </p>
              )}
              {(product.era || product.category) && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {product.era && (
                    <Link
                      href={`/era/${product.era}`}
                      className="inline-block text-xs uppercase tracking-wide text-gray-600 border border-neutral-300 px-2 py-0.5 hover:border-accent hover:text-accent transition-colors"
                    >
                      {getEraLabel(product.era)}
                    </Link>
                  )}
                  {product.category && (
                    <span className="inline-block text-xs uppercase tracking-wide text-gray-600 border border-neutral-300 px-2 py-0.5">
                      {getCategoryLabel(product.category)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/profile/${product.username}`}
                className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
              >
                @{product.username}
              </Link>
              <StartChatButton otherUserId={product.user_id} />
              <div className="ml-auto flex items-center gap-3">
                <LikeButton productId={product.id} />
                <SaveButton productId={product.id} />
                <ReportTrigger targetType="product" targetId={product.id} />
              </div>
            </div>

            <ProductActions
              productId={product.id}
              ownerId={product.user_id}
              sellerType={product.seller_type}
              isSold={product.is_sold ?? false}
            />
          </div>
        </div>

        <CompleteTheLook
          anchor={
            {
              id: product.id,
              title: product.title,
              price: product.price,
              category: product.category,
              era: product.era,
              style_tag: product.style_tag ?? null,
              fit: product.fit ?? null,
              color_group: product.color_group ?? null,
              image_url: product.image_url,
              user_id: product.user_id,
              is_sold: product.is_sold ?? null,
            } satisfies EngineProduct
          }
        />

        <div className="bg-surface border border-neutral-200 p-6 md:p-10">
          <CommentSection productId={product.id} />
        </div>
      </div>
    </main>
  );
}
