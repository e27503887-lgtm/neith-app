import ProductCard from "./ProductCard";

type ShelfProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
  comment_count?: number;
  account_type?: string | null;
};

export default function ProductShelf({ title, products }: { title: string; products: ShelfProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="py-8 border-b border-neutral-200 last:border-none">
      <h2 className="font-serif text-xl text-ink tracking-tight mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {products.map((product) => (
          <div key={product.id} className="shrink-0 w-60">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
