"use client";

import { useState } from "react";

type TagBreakdownEntry = {
  tag: string;
  count: number;
  percent: number;
};

const MAX_SEGMENTS = 5;
// Descending ink opacity steps — magnitude by tone, not by hue, to stay
// inside Neith's monochrome/accent palette instead of introducing a
// categorical color scale.
const TONE_STEPS = [1, 0.78, 0.58, 0.42, 0.28, 0.16];

function computeBreakdown(outfits: { style_tag: string | null }[]): TagBreakdownEntry[] {
  const counts = new Map<string, number>();
  let tagged = 0;

  outfits.forEach((o) => {
    if (!o.style_tag) return;
    counts.set(o.style_tag, (counts.get(o.style_tag) ?? 0) + 1);
    tagged += 1;
  });

  if (tagged === 0) return [];

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const visible = sorted.slice(0, MAX_SEGMENTS);
  const restCount = sorted.slice(MAX_SEGMENTS).reduce((sum, [, c]) => sum + c, 0);
  const buckets = restCount > 0 ? [...visible, ["Diğer", restCount] as [string, number]] : visible;

  const withExact = buckets.map(([tag, count]) => ({
    tag,
    count,
    exact: (count / tagged) * 100,
  }));

  const withFloor = withExact.map((b) => ({ ...b, percent: Math.floor(b.exact) }));
  const remainder = 100 - withFloor.reduce((sum, b) => sum + b.percent, 0);

  const byFraction = withFloor
    .map((b, i) => ({ i, frac: b.exact - Math.floor(b.exact) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < remainder; k++) {
    withFloor[byFraction[k % byFraction.length].i].percent += 1;
  }

  return withFloor
    .map(({ tag, count, percent }) => ({ tag, count, percent }))
    .sort((a, b) => b.percent - a.percent);
}

export default function StyleReport({ outfits }: { outfits: { style_tag: string | null }[] }) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null);
  const breakdown = computeBreakdown(outfits);
  const taggedCount = breakdown.reduce((sum, b) => sum + b.count, 0);

  function toneFor(index: number) {
    return TONE_STEPS[index] ?? TONE_STEPS[TONE_STEPS.length - 1];
  }

  return (
    <section className="border border-neutral-200 bg-paper p-6 md:p-8">
      <p className="section-label mb-2">Stil Karnesi</p>
      <h2 className="font-serif italic text-3xl text-ink mb-6">Tarzını Analiz Ettik</h2>

      {breakdown.length === 0 ? (
        <p className="text-sm text-gray-500">
          Henüz stil etiketiyle paylaşılmış bir kombinin yok. Yeni bir kombin paylaşırken bir
          stil etiketi seç, karnen burada belirsin.
        </p>
      ) : (
        <div>
          <div className="flex w-full h-2.5" role="img" aria-label="Stil dağılımı">
            {breakdown.map((b, i) => (
              <div
                key={b.tag}
                onMouseEnter={() => setHoveredTag(b.tag)}
                onMouseLeave={() => setHoveredTag(null)}
                style={{
                  width: `${b.percent}%`,
                  backgroundColor: `rgba(26,26,26,${toneFor(i)})`,
                  opacity: hoveredTag && hoveredTag !== b.tag ? 0.35 : 1,
                }}
                className={`h-full transition-opacity duration-200 ${i > 0 ? "ml-[2px]" : ""} ${
                  i === 0 ? "rounded-l" : ""
                } ${i === breakdown.length - 1 ? "rounded-r" : ""}`}
              />
            ))}
          </div>

          <div className="mt-6 divide-y divide-neutral-200">
            {breakdown.map((b, i) => (
              <div
                key={b.tag}
                onMouseEnter={() => setHoveredTag(b.tag)}
                onMouseLeave={() => setHoveredTag(null)}
                style={{ opacity: hoveredTag && hoveredTag !== b.tag ? 0.45 : 1 }}
                className="flex items-center gap-3 py-3 transition-opacity duration-200"
              >
                <span
                  className="w-3 h-3 shrink-0"
                  style={{ backgroundColor: `rgba(26,26,26,${toneFor(i)})` }}
                />
                <span className="text-sm uppercase tracking-wide text-ink flex-1">{b.tag}</span>
                <span className="text-xs text-gray-500">{b.count} kombin</span>
                <span className="font-serif text-xl text-ink w-14 text-right">%{b.percent}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-4">
            {taggedCount} etiketli kombin üzerinden hesaplandı.
          </p>
        </div>
      )}
    </section>
  );
}
