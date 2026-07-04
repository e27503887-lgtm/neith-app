import Link from "next/link";
import Image from "next/image";
import { supabase } from "../../utils/supabase";
import LikeButton from "../../components/LikeButton";
import SaveButton from "../../components/SaveButton";
import StartChatButton from "../../components/StartChatButton";
import CommentSection from "../../components/CommentSection";
import ProductActions from "./ProductActions";

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

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="bg-paper border border-neutral-200 rounded-xl p-6 md:p-10 flex flex-col md:flex-row gap-8">
          <div className="relative w-full md:w-1/2 aspect-square">
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover rounded-lg"
            />
          </div>

          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
              <p className="font-serif text-2xl text-ink mt-2">
                {product.price.toLocaleString("tr-TR")} ₺
              </p>
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

            <ProductActions productId={product.id} ownerId={product.user_id} />
          </div>
        </div>

        <div className="bg-paper border border-neutral-200 rounded-xl p-6 md:p-10">
          <CommentSection productId={product.id} />
        </div>
      </div>
    </main>
  );
}
