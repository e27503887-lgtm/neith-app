import Link from "next/link";
import PopularProductCard from "./PopularProductCard";

type PopularProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  like_count: number;
  comment_count: number;
};

export default function PopularProducts({ products }: { products: PopularProduct[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Popüler Ürünler</h3>
        <Link
          href="/popular"
          className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
        >
          Tümünü gör →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {products.map((product, index) => (
          <div key={product.id} className="w-48 shrink-0 snap-start">
            <PopularProductCard product={product} rank={index + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}
