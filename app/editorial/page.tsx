import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import EditorialHub from "../components/EditorialHub";
import { getArticleCategoryLabel } from "@/lib/articleCategories";

// Liste build anında donmasın: en fazla 60 sn eski veriyle sunulur (ISR).
export const revalidate = 60;

type ArticleCard = {
  kind: "article";
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category: string | null;
  date: string;
};

type AutoFashionWeekCard = {
  kind: "auto-fashion-week";
  id: string;
  title: string;
  date: string;
  outfits: { id: number | string; title: string; image_url: string }[];
};

type AutoTrendCard = {
  kind: "auto-trend";
  id: string;
  title: string;
  date: string;
  items: { id: number | string; title: string; image_url: string }[];
};

type EditorialCard = ArticleCard | AutoFashionWeekCard | AutoTrendCard;

function byDateDesc(a: EditorialCard, b: EditorialCard) {
  return new Date(b.date).getTime() - new Date(a.date).getTime();
}

export default async function EditorialPage() {
  const now = new Date().toISOString();

  const { data: articleRows } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, cover_image_url, category, created_at")
    .eq("published", true)
    .order("created_at", { ascending: false });

  const articles = articleRows ?? [];

  const toArticleCard = (a: (typeof articles)[number]): ArticleCard => ({
    kind: "article",
    id: `article-${a.id}`,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    cover_image_url: a.cover_image_url,
    category: a.category,
    date: a.created_at,
  });

  const fashionWeekArticles = articles.filter((a) => a.category === "moda_haftasi").map(toArticleCard);
  const trendArticles = articles
    .filter((a) => a.category === "trend" || a.category === "stil_kilavuzu")
    .map(toArticleCard);

  // Otomatik "Moda Haftası Kazananları" kartları — bitmiş etkinliklerin en çok
  // oylanan 3 kombini, veritabanına yazmadan render anında hesaplanır.
  const { data: finishedWeeks } = await supabase
    .from("fashion_weeks")
    .select("id, title, ends_at")
    .lt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(6);

  const weekIds = (finishedWeeks ?? []).map((w) => w.id);

  const { data: allEntries } = weekIds.length
    ? await supabase.from("fashion_week_entries").select("week_id, outfit_id").in("week_id", weekIds)
    : { data: [] as { week_id: number | string; outfit_id: number | string }[] };

  const outfitIds = [...new Set((allEntries ?? []).map((e) => e.outfit_id))];

  const [{ data: outfitRows }, { data: likeRows }] = await Promise.all([
    outfitIds.length
      ? supabase.from("outfits").select("id, title, image_url").in("id", outfitIds)
      : Promise.resolve({ data: [] as { id: number | string; title: string; image_url: string }[] }),
    outfitIds.length
      ? supabase.from("outfit_likes").select("outfit_id").in("outfit_id", outfitIds)
      : Promise.resolve({ data: [] as { outfit_id: number | string }[] }),
  ]);

  const outfitById = new Map((outfitRows ?? []).map((o) => [o.id, o]));
  const likeCountByOutfit = new Map<number | string, number>();
  (likeRows ?? []).forEach((l) => {
    likeCountByOutfit.set(l.outfit_id, (likeCountByOutfit.get(l.outfit_id) ?? 0) + 1);
  });

  const entriesByWeek = new Map<number | string, { outfit_id: number | string }[]>();
  (allEntries ?? []).forEach((e) => {
    const list = entriesByWeek.get(e.week_id) ?? [];
    list.push(e);
    entriesByWeek.set(e.week_id, list);
  });

  const fashionWeekAutoCards: AutoFashionWeekCard[] = (finishedWeeks ?? [])
    .map((week) => {
      const topOutfits = (entriesByWeek.get(week.id) ?? [])
        .map((e) => outfitById.get(e.outfit_id))
        .filter((o): o is { id: number | string; title: string; image_url: string } => !!o)
        .sort((a, b) => (likeCountByOutfit.get(b.id) ?? 0) - (likeCountByOutfit.get(a.id) ?? 0))
        .slice(0, 3);

      return {
        kind: "auto-fashion-week" as const,
        id: `fw-${week.id}`,
        title: `Moda Haftası: ${week.title} - Kazananlar`,
        date: week.ends_at,
        outfits: topOutfits,
      };
    })
    .filter((card) => card.outfits.length > 0);

  // Otomatik "Şu Anda Trend" kartı — trending_products/trending_outfits'ten ilk 3.
  const [{ data: trendingProductsRaw }, { data: trendingOutfitsRaw }] = await Promise.all([
    supabase
      .from("trending_products")
      .select("id, title, image_url, trend_score")
      .gt("trend_score", 0)
      .order("trend_score", { ascending: false }),
    supabase
      .from("trending_outfits")
      .select("id, title, image_url, trend_score")
      .gt("trend_score", 0)
      .order("trend_score", { ascending: false }),
  ]);

  const rankedTrending = [
    ...(trendingProductsRaw ?? []).map((p) => ({
      score: p.trend_score as number,
      id: p.id,
      title: p.title,
      image_url: p.image_url,
    })),
    ...(trendingOutfitsRaw ?? []).map((o) => ({
      score: o.trend_score as number,
      id: o.id,
      title: o.title,
      image_url: o.image_url,
    })),
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const trendAutoCard: AutoTrendCard | null =
    rankedTrending.length > 0
      ? {
          kind: "auto-trend",
          id: "trend-now",
          title: "Şu Anda Trend",
          date: now,
          items: rankedTrending,
        }
      : null;

  const fashionWeekSection: EditorialCard[] = [...fashionWeekArticles, ...fashionWeekAutoCards].sort(
    byDateDesc
  );
  const trendSection: EditorialCard[] = [
    ...trendArticles,
    ...(trendAutoCard ? [trendAutoCard] : []),
  ].sort(byDateDesc);

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="bg-surface border border-neutral-200 rounded-3xl p-8 shadow-sm">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Moda Dergisi</p>
            <h1 className="mt-3 text-4xl font-serif tracking-tight text-ink">Neith Editorial Hub</h1>
            <p className="mt-4 max-w-2xl text-gray-600 leading-7">
              Moda Haftası özetlerini ve stil rehberini tek bir editoryal merkezde sunuyoruz.
            </p>
          </div>

          <div className="mb-12">
            <h2 className="text-xl font-semibold text-ink mb-5">Moda Haftası Özetleri</h2>
            {fashionWeekSection.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz bir özet yayınlanmadı.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {fashionWeekSection.map((card) => (
                  <EditorialCardView key={card.id} card={card} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-ink mb-5">Trend / Stil Kılavuzu</h2>
            {trendSection.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz bir içerik yayınlanmadı.</p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {trendSection.map((card) => (
                  <EditorialCardView key={card.id} card={card} />
                ))}
              </div>
            )}
          </div>
        </section>

        <EditorialHub />
      </div>
    </main>
  );
}

function EditorialCardView({ card }: { card: EditorialCard }) {
  if (card.kind === "article") {
    return (
      <Link
        href={`/editorial/${card.slug}`}
        className="group block rounded-3xl border border-neutral-200 overflow-hidden bg-ink/5 hover:shadow-lg transition-shadow"
      >
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-neutral-100">
          {card.cover_image_url && (
            <Image
              src={card.cover_image_url}
              alt={card.title}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          )}
        </div>
        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-accent mb-2">
            {getArticleCategoryLabel(card.category)}
          </p>
          <h3 className="text-lg font-semibold text-ink leading-tight">{card.title}</h3>
          {card.excerpt && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{card.excerpt}</p>}
        </div>
      </Link>
    );
  }

  if (card.kind === "auto-fashion-week") {
    return (
      <Link
        href="/fashion-week"
        className="group block rounded-3xl border border-neutral-200 overflow-hidden bg-ink/5 hover:shadow-lg transition-shadow"
      >
        <div className="grid grid-cols-3 gap-px bg-neutral-200">
          {[0, 1, 2].map((i) => {
            const outfit = card.outfits[i];
            return (
              <div key={i} className="relative aspect-square bg-neutral-100 overflow-hidden">
                {outfit && (
                  <Image
                    src={outfit.image_url}
                    alt={outfit.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-accent mb-2">Otomatik Özet</p>
          <h3 className="text-lg font-semibold text-ink leading-tight">{card.title}</h3>
          <p className="mt-2 text-sm text-gray-600 truncate">{card.outfits.map((o) => o.title).join(" · ")}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/popular"
      className="group block rounded-3xl border border-neutral-200 overflow-hidden bg-ink/5 hover:shadow-lg transition-shadow"
    >
      <div className="grid grid-cols-3 gap-px bg-neutral-200">
        {[0, 1, 2].map((i) => {
          const item = card.items[i];
          return (
            <div key={i} className="relative aspect-square bg-neutral-100 overflow-hidden">
              {item && (
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-accent mb-2">Otomatik Özet</p>
        <h3 className="text-lg font-semibold text-ink leading-tight">{card.title}</h3>
        <p className="mt-2 text-sm text-gray-600 truncate">{card.items.map((i) => i.title).join(" · ")}</p>
      </div>
    </Link>
  );
}
