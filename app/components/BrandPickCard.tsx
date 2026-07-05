import Link from "next/link";
import Image from "next/image";
import BrandBadge from "./BrandBadge";

type BrandPickProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
};

export default function BrandPickCard({ product }: { product: BrandPickProduct }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="card-hover group block bg-paper border border-neutral-200 overflow-hidden"
    >
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={product.image_url}
          alt={product.title}
          fill
          sizes="192px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-gray-500 mb-1 truncate">
          <BrandBadge /> {product.username}
        </span>
        <h2 className="text-sm truncate">{product.title}</h2>
        <p className="font-serif text-lg text-ink mt-0.5">{product.price.toLocaleString("tr-TR")} ₺</p>
      </div>
    </Link>
  );
}
