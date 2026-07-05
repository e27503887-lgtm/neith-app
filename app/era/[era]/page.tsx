import Link from "next/link";
import ProductCard from "../../components/ProductCard";
import OutfitCard from "../../components/OutfitCard";
import { ERAS } from "@/lib/eras";
import { supabase } from "../../utils/supabase";

type Props = {
  params: Promise<{ era: string }>;
  searchParams: Promise<{ filter?: string }>;
};

export default async function EraDetailPage({ params, searchParams }: Props) {
  const { era } = await params;
  const { filter } = await searchParams;
  const activeFilter = filter === "products" || filter === "outfits" ? filter : "all";

  const eraInfo = ERAS.find((e) => e.value === era);

  if (!eraInfo) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Dönem bulunamadı.</p>
      </main>
    );
  }

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .eq("era", era)
    .order("created_at", { ascending: false });

  const { data: outfits } = await supabase
    .from("outfits")
    .select("*")
    .eq("era", era)
    .order("created_at", { ascending: false });

  const usernames = [...new Set((products ?? []).map((p) => p.username))];
  const outfitUserIds = [...new Set((outfits ?? []).map((o) => o.user_id))];

  const { data: profiles } = usernames.length
    ? await supabase
        .from("profiles")
        .select("username, avatar_url, account_type")
        .in("username", usernames)
    : { data: [] as { username: string; avatar_url: string | null; account_type: string | null }[] };

  const { data: outfitProfiles } = outfitUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url, account_type")
        .in("id", outfitUserIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null; account_type: string | null }[] };

  const profileByUsername = new Map((profiles ?? []).map((p) => [p.username, p]));
  const profileById = new Map((outfitProfiles ?? []).map((p) => [p.id, p]));

  const productIds = (products ?? []).map((p) => p.id);
  const { data: commentRows } = productIds.length
    ? await supabase.from("comments").select("product_id").in("product_id", productIds)
    : { data: [] as { product_id: number | string }[] };

  const commentCountByProduct = new Map<number | string, number>();
  (commentRows ?? []).forEach((c) => {
    commentCountByProduct.set(c.product_id, (commentCountByProduct.get(c.product_id) ?? 0) + 1);
  });

  const enrichedProducts = (products ?? []).map((product) => ({
    ...product,
    avatar_url: profileByUsername.get(product.username)?.avatar_url ?? null,
    account_type: profileByUsername.get(product.username)?.account_type ?? null,
    comment_count: commentCountByProduct.get(product.id) ?? 0,
  }));

  const enrichedOutfits = (outfits ?? []).map((outfit) => ({
    ...outfit,
    username: profileById.get(outfit.user_id)?.username ?? "Bilinmeyen kullanıcı",
    avatar_url: profileById.get(outfit.user_id)?.avatar_url ?? null,
    account_type: profileById.get(outfit.user_id)?.account_type ?? null,
  }));

  type FeedItem =
    | { kind: "product"; created_at: string; data: (typeof enrichedProducts)[number] }
    | { kind: "outfit"; created_at: string; data: (typeof enrichedOutfits)[number] };

  const mixedItems: FeedItem[] = [
    ...enrichedProducts.map((p): FeedItem => ({ kind: "product", created_at: p.created_at, data: p })),
    ...enrichedOutfits.map((o): FeedItem => ({ kind: "outfit", created_at: o.created_at, data: o })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const isEmpty = enrichedProducts.length === 0 && enrichedOutfits.length === 0;

  const tabs = [
    { label: "Tümü", value: "all", href: `/era/${era}` },
    { label: "Ürünler", value: "products", href: `/era/${era}?filter=products` },
    { label: "Kombinler", value: "outfits", href: `/era/${era}?filter=outfits` },
  ];

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <section className="max-w-6xl mx-auto pt-6 pb-10 border-b border-neutral-200 mb-10">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">
          {eraInfo.label}
        </h1>
        <p className="text-gray-500 text-base mt-3 max-w-xl">{eraInfo.description}</p>
      </section>

      <div className="max-w-6xl mx-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center text-center py-12 md:py-24 gap-4">
            <p className="text-gray-500">
              Bu dönemden henüz parça yok — ilk ekleyen sen ol!
            </p>
            <Link href="/sell" className="btn-primary">
              İlan Ver
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-6 border-b border-neutral-200 mb-8">
              {tabs.map((tab) => (
                <Link
                  key={tab.value}
                  href={tab.href}
                  className={`pb-3 -mb-px border-b-2 text-sm font-medium whitespace-nowrap ${
                    activeFilter === tab.value
                      ? "border-accent text-ink"
                      : "border-transparent text-gray-500 hover:text-accent transition-colors"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeFilter === "all" &&
                mixedItems.map((item) =>
                  item.kind === "product" ? (
                    <ProductCard key={`p-${item.data.id}`} product={item.data} />
                  ) : (
                    <OutfitCard key={`o-${item.data.id}`} outfit={item.data} />
                  )
                )}
              {activeFilter === "products" &&
                enrichedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              {activeFilter === "outfits" &&
                enrichedOutfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
