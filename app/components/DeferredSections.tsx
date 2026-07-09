"use client";

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";
import TrendingSection from "./TrendingSection";
import type { TrendingItem } from "./TrendingCard";
import BrandPicks from "./BrandPicks";
import PopularProducts from "./PopularProducts";

// Ana içerik boyandıktan sonra (LazyVisible ile görünür olunca) kendi
// verisini çeken yatay bölümler. Sorguları sunucudaki ilk render'dan alır.

export function TrendingStrip() {
  const [items, setItems] = useState<TrendingItem[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const [{ data: products }, { data: outfits }] = await Promise.all([
        supabase
          .from("trending_products")
          .select("id, title, price, image_url, trend_score")
          .gt("trend_score", 0)
          .order("trend_score", { ascending: false })
          .limit(8),
        supabase
          .from("trending_outfits")
          .select("id, title, image_url, trend_score")
          .gt("trend_score", 0)
          .order("trend_score", { ascending: false })
          .limit(8),
      ]);

      if (!active) return;

      const ranked = [
        ...(products ?? []).map((p) => ({
          score: p.trend_score as number,
          item: {
            kind: "product" as const,
            id: p.id,
            title: p.title,
            price: p.price,
            image_url: p.image_url,
          },
        })),
        ...(outfits ?? []).map((o) => ({
          score: o.trend_score as number,
          item: { kind: "outfit" as const, id: o.id, title: o.title, image_url: o.image_url },
        })),
      ].sort((a, b) => b.score - a.score);

      setItems(ranked.slice(0, 8).map((r) => r.item));
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return <TrendingSection items={items} />;
}

export function BrandPicksStrip() {
  const [products, setProducts] = useState<
    { id: number | string; title: string; price: number; image_url: string; username: string }[]
  >([]);

  useEffect(() => {
    let active = true;

    supabase
      .from("products")
      .select("id, title, price, image_url, username")
      .eq("seller_type", "brand")
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (active) setProducts(data ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  return <BrandPicks products={products} />;
}

export function PopularStrip() {
  const [products, setProducts] = useState<
    Parameters<typeof PopularProducts>[0]["products"]
  >([]);

  useEffect(() => {
    let active = true;

    supabase
      .from("popular_products")
      .select("*")
      .gt("popularity_score", 0)
      .order("popularity_score", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (active) setProducts(data ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  return <PopularProducts products={products} />;
}
