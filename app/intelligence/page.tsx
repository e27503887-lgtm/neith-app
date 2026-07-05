"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../utils/supabase";
import StyleReport from "../components/StyleReport";
import CapsulePlanner from "../components/CapsulePlanner";
import StyleAssistantPanel from "../components/StyleAssistantPanel";

type OwnOutfit = { style_tag: string | null };
type OwnProduct = { id: number | string; title: string; image_url: string };

export default function IntelligencePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [outfits, setOutfits] = useState<OwnOutfit[]>([]);
  const [products, setProducts] = useState<OwnProduct[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const [{ data: outfitRows }, { data: productRows }] = await Promise.all([
        supabase.from("outfits").select("style_tag").eq("user_id", data.user.id),
        supabase
          .from("products")
          .select("id, title, image_url")
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: false }),
      ]);

      setOutfits(outfitRows ?? []);
      setProducts(productRows ?? []);
      setCheckingAuth(false);
    });
  }, [router]);

  if (checkingAuth) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 border-b border-neutral-200 pb-8">
          <p className="section-label mb-2">Stil Asistanı</p>
          <h1 className="font-serif text-4xl text-ink tracking-tight">AI Style Intelligence</h1>
          <p className="text-gray-500 text-sm mt-3 max-w-xl">
            Paylaştığın kombinlerin analizini ve gardırobundan üretilen haftalık kombin
            önerilerini burada bul.
          </p>
        </div>

        <div className="space-y-8">
          <StyleAssistantPanel products={products} totalItemCount={outfits.length + products.length} />
          <StyleReport outfits={outfits} />
          <CapsulePlanner products={products} />
        </div>
      </div>
    </main>
  );
}
