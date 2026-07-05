import Parser from "rss-parser";
import { NextResponse } from "next/server";

const feeds = [
  { url: "https://www.vogue.com/rss", source: "Vogue", region: "Global", flag: "🌍" },
  { url: "https://hypebeast.com/rss", source: "Hypebeast", region: "Global", flag: "🌍" },
  { url: "https://www.highsnobiety.com/feed/", source: "Highsnobiety", region: "Europe", flag: "🇪🇺" },
  { url: "https://fashionista.com/.rss", source: "Fashionista", region: "US", flag: "🇺🇸" },
  { url: "https://www.wwd.com/feeds/all/rss/", source: "WWD", region: "US", flag: "🇺🇸" },
];

const parser = new Parser({ timeout: 10000 });

function scoreFromDate(dateStr?: string) {
  if (!dateStr) return 40;
  const then = new Date(dateStr).getTime();
  const now = Date.now();
  const days = Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
  const score = Math.max(20, 100 - days * 3);
  return score;
}

export async function GET() {
  try {
    const results: any[] = [];

    await Promise.all(
      feeds.map(async (f) => {
        try {
          const feed = await parser.parseURL(f.url);
          const items = (feed.items || []).slice(0, 6);
          items.forEach((it: any) => {
            results.push({
              id: (it.id || it.link || it.guid || it.title).toString(),
              source: f.source,
              region: f.region,
              flag: f.flag,
              title: it.title,
              link: it.link,
              summary: it.contentSnippet || it.content || it.summary || "",
              publishedAt: it.pubDate || it.isoDate || null,
              score: scoreFromDate(it.pubDate || it.isoDate),
            });
          });
        } catch (e) {
          // ignore single-feed failure
        }
      })
    );

    // sort by score desc then date
    results.sort((a, b) => (b.score - a.score) || (new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()));

    const items = results.slice(0, 12);
    const res = NextResponse.json({ items });
    // Cache on CDN for 5 minutes, allow stale while revalidate for 10 minutes
    res.headers.set("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch (err) {
    const res = NextResponse.json({ items: [] });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res;
  }
}
