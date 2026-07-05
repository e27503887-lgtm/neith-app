import Link from "next/link";
import BrandPickCard from "./BrandPickCard";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
};

export default function BrandPicks({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Markalardan Seçkiler</h3>
        <Link
          href="/stores"
          className="text-xs uppercase tracking-wide text-gray-500 hover:text-accent transition-colors"
        >
          Tüm Mağazalar →
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
        {products.map((product) => (
          <div key={product.id} className="w-[78vw] sm:w-48 shrink-0 snap-start">
            <BrandPickCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
