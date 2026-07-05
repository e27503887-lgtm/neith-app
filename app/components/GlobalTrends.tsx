"use client";

import { useEffect, useState } from "react";

type Trend = {
  id: string;
  source: string;
  region: string;
  flag: string;
  title: string;
  summary: string;
  link?: string;
  publishedAt?: string | null;
  score: number;
};

export default function GlobalTrends({ compact = false }: { compact?: boolean }) {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  function getFlagAsset(t: Trend) {
    const r = (t.region || "").toLowerCase();
    if (r.includes("us") || r.includes("america") || t.source.toLowerCase().includes("us")) return "/flags/us.svg";
    if (r.includes("europe") || r === "eu") return "/flags/eu.svg";
    if (r.includes("global") || r.includes("world")) return "/flags/globe.svg";
    return "/flags/default.svg";
  }

  function truncate(text: string | undefined, max = 100) {
    if (!text) return "";
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > max ? cleaned.slice(0, max - 1).trim() + "…" : cleaned;
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/global-trends");
        const json = await res.json();
        if (!active) return;
        const items: Trend[] = (json.items || []).map((it: any) => ({
          id: it.id,
          source: it.source,
          region: it.region,
          flag: it.flag,
          title: it.title,
          summary: it.summary,
          link: it.link,
          publishedAt: it.publishedAt,
          score: it.score,
        }));
        setTrends(items);
      } catch (e) {
        // fallback empty
        setTrends([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div id="global-trends" className={`bg-paper border border-neutral-200 p-4 ${compact ? "text-sm" : ""}`}>
      <h3 className="section-label mb-3">Dünyada Şu Anda Moda</h3>

      <div className="flex items-center gap-2 mb-3">
        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="text-xs border border-neutral-200 px-2 py-1 rounded"
        >
          <option value="all">Tüm Bölgeler</option>
          {[...new Set(trends.map((t) => t.region))].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="text-xs border border-neutral-200 px-2 py-1 rounded"
        >
          <option value="all">Tüm Kaynaklar</option>
          {[...new Set(trends.map((t) => t.source))].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-12 h-12 bg-neutral-100 rounded-md" />
              <div className="flex-1">
                <div className="h-3 bg-neutral-100 rounded w-3/4 mb-2" />
                <div className="h-2 bg-neutral-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {trends
            .filter((t) => (regionFilter === "all" ? true : t.region === regionFilter))
            .filter((t) => (sourceFilter === "all" ? true : t.source === sourceFilter))
            .map((t) => (
              <article key={t.id} className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center bg-white rounded-md shadow-sm border overflow-hidden">
                  <img
                    src={getFlagAsset(t)}
                    alt={t.region}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <a href={t.link} target="_blank" rel="noreferrer" className="font-medium text-sm hover:underline" title={t.title}>
                      {truncate(t.title, 70)}
                    </a>
                    <div className="text-xs text-gray-500">{t.source}</div>
                  </div>
                  <p className="text-xs text-gray-500">{truncate(t.summary, 100)}</p>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="w-3/4 h-2 bg-neutral-100 rounded-full overflow-hidden mr-3">
                      <div style={{ width: `${t.score}%` }} className="h-2 bg-accent" />
                    </div>
                    <div className="text-xs text-gray-400">{t.publishedAt ? new Date(t.publishedAt).toLocaleDateString() : ""}</div>
                  </div>
                </div>
              </article>
            ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <a href="/fashion-week" className="text-xs text-gray-600 underline">Daha Fazla</a>
        <button
          onClick={() => {
            setLoading(true);
            fetch("/api/global-trends").then((r) => r.json()).then((json) => {
              setTrends((json.items || []).slice(0, 12));
            }).finally(() => setLoading(false));
          }}
          className="text-xs border border-neutral-300 px-3 py-1 rounded text-gray-700"
        >
          Yenile
        </button>
      </div>
    </div>
  );
}
