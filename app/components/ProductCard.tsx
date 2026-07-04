"use client";

import { useState } from "react";
import Link from "next/link";
import LikeButton from "./LikeButton";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
};

export default function ProductCard({ product }: { product: Product }) {
  const [offer, setOffer] = useState("");

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <Link href={`/product/${product.id}`}>
        <img
          src={product.image_url}
          alt={product.title}
          className="w-full aspect-square object-cover"
        />
      </Link>
      <div className="p-4 flex flex-col gap-1">
        <Link href={`/product/${product.id}`}>
          <h2 className="text-lg font-semibold truncate hover:underline">{product.title}</h2>
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-gray-900 font-medium">
            {product.price.toLocaleString("tr-TR")} ₺
          </p>
          <LikeButton productId={product.id} />
        </div>
        <Link
          href={`/profile/${product.username}`}
          className="text-sm text-gray-500 hover:text-gray-700 hover:underline w-fit"
        >
          @{product.username}
        </Link>

        <input
          type="text"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="Teklifin"
          className="border p-1 w-full mt-2 rounded-md"
        />
        <button
          onClick={() => console.log("Teklif:", offer)}
          className="bg-black text-white w-full mt-1 p-2 rounded-md"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}
