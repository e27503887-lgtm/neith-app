"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import ProductCard from "../components/ProductCard";
import { supabase } from "../utils/supabase";

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

type ProfileResult = {
  id: string;
  username: string;
  avatar_url: string | null;
};

export default function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim() ?? "";

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<ProfileResult[]>([]);

  useEffect(() => {
    if (!q) {
      return;
    }

    let active = true;

    async function search() {
      setLoading(true);

      const [{ data: matchedProducts }, { data: matchedUsers }] = await Promise.all([
        supabase.from("products").select("*").ilike("title", `%${q}%`),
        supabase.from("profiles").select("id, username, avatar_url").ilike("username", `%${q}%`),
      ]);

      if (!active) return;

      const usernames = [...new Set((matchedProducts ?? []).map((p) => p.username))];
      const { data: profiles } = usernames.length
        ? await supabase
            .from("profiles")
            .select("username, avatar_url, account_type")
            .in("username", usernames)
        : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

      if (!active) return;

      const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));

      const productIds = (matchedProducts ?? []).map((p) => p.id);
      const { data: commentRows } = productIds.length
        ? await supabase.from("comments").select("product_id").in("product_id", productIds)
        : { data: [] as { product_id: number | string }[] };

      if (!active) return;

      const commentCountByProduct = new Map<number | string, number>();
      (commentRows ?? []).forEach((c) => {
        commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
      });

      setProducts(
        (matchedProducts ?? []).map((p) => ({
          ...p,
          avatar_url: profileByUsername.get(p.username)?.avatar_url ?? null,
          account_type: profileByUsername.get(p.username)?.account_type ?? null,
          comment_count: commentCountByProduct.get(p.id) ?? 0,
        }))
      );
      setUsers(matchedUsers ?? []);
      setLoading(false);
    }

    search();
    return () => {
      active = false;
    };
  }, [q]);

  if (!q) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] pt-24 px-6">
        <div className="max-w-5xl mx-auto text-center text-gray-500 py-24">
          Kombin, ürün veya kullanıcı ara
        </div>
      </main>
    );
  }

  if (loading) {
    return null;
  }

  const totalCount = products.length + users.length;

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-bold mb-8">
          &ldquo;{q}&rdquo; için {totalCount} sonuç
        </h1>

        {totalCount === 0 ? (
          <div className="text-center text-gray-500 py-24">Aradığın şey bulunamadı.</div>
        ) : (
          <div className="flex flex-col gap-10">
            {users.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">Kullanıcılar</h2>
                <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100 overflow-hidden">
                  {users.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.username}`}
                      className="flex items-center gap-3 p-4 hover:bg-gray-50"
                    >
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
                          alt={u.username}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-medium">@{u.username}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {products.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">Ürünler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
