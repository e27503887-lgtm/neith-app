import Link from "next/link";
import { getEraLabel } from "@/lib/eras";
import { supabase } from "../../utils/supabase";
import LikeButton from "../../components/LikeButton";
import SaveButton from "../../components/SaveButton";
import StartChatButton from "../../components/StartChatButton";
import CommentSection from "../../components/CommentSection";
import ProductActions from "./ProductActions";
import ProductGallery from "./ProductGallery";

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

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-paper border border-neutral-200 p-6 md:p-10 flex flex-col md:flex-row gap-8">
          <ProductGallery media={media} title={product.title} />

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="font-serif text-2xl text-ink">
                  {product.price.toLocaleString("tr-TR")} ₺
                </p>
                {isBrand && (
                  <span className="text-xs uppercase tracking-wide text-accent border border-accent px-2 py-0.5">
                    Sabit Fiyat
                  </span>
                )}
              </div>
              {product.description && (
                <p className="text-gray-600 text-sm mt-3 whitespace-pre-line">
                  {product.description}
                </p>
              )}
              {product.era && (
                <Link
                  href={`/era/${product.era}`}
                  className="inline-block mt-3 text-xs uppercase tracking-wide text-gray-600 border border-neutral-300 px-2 py-0.5 hover:border-accent hover:text-accent transition-colors"
                >
                  {getEraLabel(product.era)}
                </Link>
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
              </div>
            </div>

            <ProductActions
              productId={product.id}
              ownerId={product.user_id}
              sellerType={product.seller_type}
            />
          </div>
        </div>

        <div className="bg-paper border border-neutral-200 p-6 md:p-10">
          <CommentSection productId={product.id} />
        </div>
      </div>
    </main>
  );
}
