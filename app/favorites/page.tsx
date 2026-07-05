"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { supabase } from "../utils/supabase";

type Product = {
  id: number | string;
  title: string;
  price: number;
  image_url: string;
  username: string;
  avatar_url?: string | null;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      setCheckingAuth(false);

      const { data: saves } = await supabase
        .from("saves")
        .select("product_id, created_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });

      if (!saves || saves.length === 0) {
        setLoading(false);
        return;
      }

      const productIds = saves.map((s) => s.product_id);

      const { data: savedProducts } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

      const productById = new Map((savedProducts ?? []).map((p) => [p.id, p]));
      const orderedProducts = productIds
        .map((id) => productById.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p);

      const usernames = [...new Set(orderedProducts.map((p) => p.username))];

      const { data: profiles } = usernames.length
        ? await supabase.from("profiles").select("username, avatar_url").in("username", usernames)
        : { data: [] as { username: string; avatar_url: string | null }[] };

      const avatarByUsername = new Map((profiles ?? []).map((p) => [p.username, p.avatar_url]));

      setProducts(
        orderedProducts.map((p) => ({
          ...p,
          avatar_url: avatarByUsername.get(p.username) ?? null,
        }))
      );
      setLoading(false);
    });
  }, [router]);

  if (checkingAuth || loading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Favoriler</h1>
          <p className="text-gray-500 text-sm mt-1">Kaydettiğin ilanlar burada.</p>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-12 md:py-24 gap-4">
            <Heart size={28} strokeWidth={1} className="text-neutral-300" />
            <p className="text-gray-500">
              Henüz bir şey kaydetmedin. Beğendiğin kombinleri buradan takip et!
            </p>
            <Link href="/" className="btn-primary">
              Ana Sayfaya Dön
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
