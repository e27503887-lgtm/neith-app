import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";

type RecommendedProduct = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
};

function pickRandom<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export default async function RecommendedItems() {
  const { data } = await supabase
    .from("products")
    .select("id, title, price, image_url")
    .order("created_at", { ascending: false })
    .limit(30);

  const products = pickRandom((data ?? []) as RecommendedProduct[], 3);

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="mb-12 border border-neutral-200 bg-paper p-6 md:p-8">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-2">Senin İçin</p>
          <h2 className="font-serif italic text-3xl md:text-4xl tracking-tight text-ink">
            Senin İçin Seçtiklerimiz
          </h2>
        </div>
        <p className="hidden md:block text-xs text-gray-500 max-w-[220px] text-right">
          Zevkine göre küratörlüğünü yaptığımız özel bir seçki.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {products.map((product) => (
          <Link key={product.id} href={`/product/${product.id}`} className="group block">
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-50">
              <Image
                src={product.image_url}
                alt={product.title}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
            <div className="pt-3">
              <h3 className="text-sm text-ink truncate">{product.title}</h3>
              <p className="font-serif text-ink text-lg mt-0.5">
                {product.price.toLocaleString("tr-TR")} ₺
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
