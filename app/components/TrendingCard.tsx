import Link from "next/link";
import Image from "next/image";
import { TrendingUp } from "lucide-react";

type TrendingProduct = {
  kind: "product";
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

type TrendingOutfit = {
  kind: "outfit";
  id: number | string;
  title: string;
  image_url: string;
};

export type TrendingItem = TrendingProduct | TrendingOutfit;

export default function TrendingCard({ item }: { item: TrendingItem }) {
  const href = item.kind === "product" ? `/product/${item.id}` : `/outfit/${item.id}`;

  return (
    <Link href={href} className="block bg-paper border border-neutral-200 overflow-hidden">
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        {item.kind === "outfit" && (
          <span className="absolute top-2 left-2 z-10 bg-paper/90 text-ink text-xs uppercase tracking-wide font-medium px-2 py-1">
            Kombin
          </span>
        )}
        <span className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-accent text-paper text-[11px] uppercase tracking-wide font-medium px-2 py-1">
          <TrendingUp size={11} strokeWidth={2} />
          Trend
        </span>
        <Image
          src={item.image_url}
          alt={item.title}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 192px"
          className="object-cover transition-transform duration-500 ease-out hover:scale-105"
        />
      </div>
      <div className="p-3">
        <h2 className="text-sm truncate">{item.title}</h2>
        {item.kind === "product" && (
          <p className="font-serif text-lg text-ink mt-0.5">
            {item.price.toLocaleString("tr-TR")} ₺
          </p>
        )}
      </div>
    </Link>
  );
}
