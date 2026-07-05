import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle } from "lucide-react";

type PopularProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  like_count: number;
  comment_count: number;
};

export default function PopularProductCard({
  product,
  rank,
}: {
  product: PopularProduct;
  rank: number;
}) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="card-hover block bg-paper border border-neutral-200 overflow-hidden"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <span className="absolute top-2 left-2 z-10 bg-paper/90 px-2 py-1">
          <span className="font-serif text-lg text-ink leading-none">
            {String(rank).padStart(2, "0")}
          </span>
        </span>
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 192px"
          className="object-cover transition-transform duration-500 ease-out hover:scale-105"
        />
      </div>
      <div className="p-3">
        <h2 className="text-sm truncate">{product.title}</h2>
        <p className="font-serif text-lg text-ink mt-0.5">
          {product.price.toLocaleString("tr-TR")} ₺
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1">
            <Heart size={12} strokeWidth={1.5} /> {product.like_count}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} strokeWidth={1.5} /> {product.comment_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
