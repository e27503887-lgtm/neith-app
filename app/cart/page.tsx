"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { supabase } from "../utils/supabase";
import { CART_UPDATED_EVENT, notifyCartUpdated } from "../utils/cart";

type CartItem = {
  id: number;
  product_id: number | string;
  quantity: number;
  product: {
    id: number | string;
    title: string;
    price: number;
    image_url: string;
    username: string;
    seller_type: string | null;
  } | null;
};

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CartItem[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id ?? null;

      if (!uid) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, product:products!cart_items_product_id_fkey(id, title, price, image_url, username, seller_type)")
        .eq("user_id", uid)
        .order("id", { ascending: true });

      if (!active) return;

      if (!error) {
        setItems(
          (data ?? []).map((row: any) => ({
            id: row.id,
            product_id: row.product_id,
            quantity: row.quantity,
            product: row.product
              ? {
                  id: row.product.id,
                  title: row.product.title,
                  price: row.product.price,
                  image_url: row.product.image_url,
                  username: row.product.username,
                  seller_type: row.product.seller_type,
                }
              : null,
          }))
        );
      }

      setLoading(false);
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    function handleCartChange() {
      setPendingAction(null);
    }

    window.addEventListener(CART_UPDATED_EVENT, handleCartChange);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handleCartChange);
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      if (!item.product) return sum;
      return sum + item.product.price * item.quantity;
    }, 0);
  }, [items]);

  async function updateQuantity(itemId: number, nextQuantity: number) {
    const current = items.find((entry) => entry.id === itemId);
    if (!current) return;

    const optimistic = items.map((entry) => (entry.id === itemId ? { ...entry, quantity: nextQuantity } : entry));
    setItems(optimistic);

    if (nextQuantity <= 0) {
      const confirmed = window.confirm("Bu ürünü sepetten kaldırmak istiyor musun?");
      if (!confirmed) {
        setItems(items);
        return;
      }
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (!error) {
        setItems((prev) => prev.filter((entry) => entry.id !== itemId));
        notifyCartUpdated();
      }
      return;
    }

    const { error } = await supabase.from("cart_items").update({ quantity: nextQuantity }).eq("id", itemId);
    if (!error) {
      notifyCartUpdated();
    } else {
      setItems(items);
    }
  }

  async function removeItem(itemId: number) {
    const confirmed = window.confirm("Bu ürünü sepetten kaldırmak istiyor musun?");
    if (!confirmed) return;

    setItems((prev) => prev.filter((entry) => entry.id !== itemId));
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
    if (!error) {
      notifyCartUpdated();
    } else {
      setItems(items);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-paper pt-24 px-6" />;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-24 px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="border-b border-neutral-200 pb-6">
          <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Sepet</p>
          <h1 className="mt-2 font-serif text-4xl text-ink">Sepetiniz</h1>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded border border-neutral-200 bg-white px-6 py-16 text-center">
            <ShoppingBag size={28} strokeWidth={1.2} className="text-neutral-300" />
            <p className="text-sm text-neutral-500">Sepetin boş.</p>
            <Link href="/listings" className="text-xs uppercase tracking-[0.2em] text-accent underline underline-offset-4 hover:text-ink">
              Ürünleri keşfet
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
            <div className="space-y-4">
              {items.map((item) => {
                if (!item.product) return null;
                return (
                  <div key={item.id} className="flex flex-col gap-4 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
                    <Link href={`/product/${item.product.id}`} className="relative h-24 w-full shrink-0 overflow-hidden rounded border border-neutral-200 sm:w-24">
                      <Image src={item.product.image_url} alt={item.product.title} fill className="object-cover" />
                    </Link>

                    <div className="flex-1">
                      <Link href={`/product/${item.product.id}`} className="text-sm font-medium text-ink hover:text-accent">
                        {item.product.title}
                      </Link>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-gray-500">{item.product.username}</p>
                      <p className="mt-2 font-serif text-lg text-ink">{item.product.price.toLocaleString("tr-TR")} ₺</p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:ml-auto sm:flex-col sm:items-end">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Azalt"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-paper transition-colors hover:border-accent"
                        >
                          <Minus size={14} strokeWidth={1.5} />
                        </button>
                        <span className="min-w-8 text-center text-sm text-ink">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Arttır"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-paper transition-colors hover:border-accent"
                        >
                          <Plus size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-serif text-lg text-ink">{(item.product.price * item.quantity).toLocaleString("tr-TR")} ₺</p>
                        <button
                          type="button"
                          aria-label="Kaldır"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-500 transition-colors hover:text-accent"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="rounded border border-neutral-200 bg-white p-6">
              <h2 className="font-serif text-2xl text-ink">Özet</h2>
              <div className="mt-4 flex items-center justify-between border-b border-neutral-200 pb-4 text-sm text-gray-600">
                <span>Ara Toplam</span>
                <span className="font-serif text-lg text-ink">{subtotal.toLocaleString("tr-TR")} ₺</span>
              </div>
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed bg-ink px-4 py-3 text-sm uppercase tracking-[0.2em] text-paper opacity-50"
              >
                Ödemeye Geç
              </button>
              <p className="mt-3 text-center text-xs uppercase tracking-[0.2em] text-gray-500">
                Ödeme sistemi yakında aktif olacak.
              </p>
              <p className="mt-4 border-t border-neutral-200 pt-4 text-xs text-gray-500 leading-5">
                Satıcılar genellikle 3 iş günü içinde kargolar. Gecikme olursa mesajla iletişime
                geçebilirsin.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
