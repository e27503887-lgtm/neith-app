import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import LikeButton from "./LikeButton";
import SaveButton from "./SaveButton";
import BrandBadge from "./BrandBadge";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  comment_count?: number;
  account_type?: string | null;
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <article className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <Link href={`/profile/${product.username}`} className="shrink-0">
          {product.avatar_url ? (
            <Image
              src={product.avatar_url}
              alt={product.username}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
              {product.username?.[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <Link
          href={`/profile/${product.username}`}
          className="flex items-center gap-1 text-sm font-medium hover:underline"
        >
          @{product.username}
          {product.account_type === "brand" && <BrandBadge />}
        </Link>
      </div>

      <Link href={`/product/${product.id}`} className="relative block w-full aspect-square">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </Link>

      <div className="flex items-center gap-4 px-3 pt-3">
        <LikeButton productId={product.id} />
        <Link
          href={`/product/${product.id}`}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600"
        >
          <MessageCircle size={20} />
          <span className="text-sm">{product.comment_count ?? 0}</span>
        </Link>
        <div className="ml-auto">
          <SaveButton productId={product.id} />
        </div>
      </div>

      <div className="px-3 pt-2">
        <h2 className="text-sm font-semibold truncate">{product.title}</h2>
        <p className="text-gray-900 text-sm font-medium mt-0.5">
          {product.price.toLocaleString("tr-TR")} ₺
        </p>
      </div>

      <div className="p-3">
        <Link
          href={`/product/${product.id}`}
          className="block w-full bg-black text-white text-center py-2.5 rounded-md font-medium hover:bg-gray-800"
        >
          Ürüne Git
        </Link>
      </div>
    </article>
  );
}
