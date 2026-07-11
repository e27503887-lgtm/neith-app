"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type BrandProduct = {
  id: string;
  title: string;
  price: number;
  image_url: string;
};

const mock: BrandProduct[] = [
  {
    id: "b1",
    title: "Linen Overshirt",
    price: 349,
    image_url: "https://images.unsplash.com/photo-1520975911998-5ae3a1c1b9a1?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "b2",
    title: "Structured Blazer",
    price: 679,
    image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80&auto=format&fit=crop",
  },
  {
    id: "b3",
    title: "Tailored Trousers",
    price: 429,
    image_url: "https://images.unsplash.com/photo-1488722796624-0aa6f1bb6399?w=800&q=80&auto=format&fit=crop",
  },
];

export default function BrandShowcase() {
  const [products] = useState<BrandProduct[]>(mock);

  return (
    <div className="bg-surface border border-neutral-200 p-4 rounded">
      <h3 className="text-sm font-semibold">Brand Partners</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4">New Arrivals</p>

      <div className="flex flex-col gap-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-3 bg-surface p-3 rounded shadow-sm">
            <Link href={`/product/${p.id}`} className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
              <Image src={p.image_url} alt={p.title} fill className="object-cover" />
            </Link>

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{p.title}</div>
              <div className="text-xs text-gray-500">{p.price.toLocaleString("tr-TR")} ₺</div>
            </div>

            <div className="ml-auto">
              <a
                href={`/product/${p.id}`}
                className="inline-block bg-black text-white px-3 py-2 text-xs rounded font-medium"
              >
                Buy Now
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
