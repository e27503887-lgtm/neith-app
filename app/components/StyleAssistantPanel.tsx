"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { supabase } from "../utils/supabase";
import { MIN_ITEMS } from "@/lib/styleAssistant";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

type OwnProduct = { id: number | string; title: string; image_url: string };

type WeeklyCalendarDay = {
  day: string;
  product_ids: (number | string)[];
  note: string;
};

type Report = {
  report_text: string;
  weekly_calendar: WeeklyCalendarDay[];
  generated_at: string;
};

export default function StyleAssistantPanel({
  products,
  totalItemCount,
}: {
  products: OwnProduct[];
  totalItemCount: number;
}) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsMoreData, setNeedsMoreData] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadExisting() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (active) setLoading(false);
        return;
      }

      const { data: existing } = await supabase
        .from("style_reports")
        .select("report_text, weekly_calendar, generated_at")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!active) return;
      if (existing) setReport(existing as Report);
      setLoading(false);
    }

    loadExisting();
    return () => {
      active = false;
    };
  }, []);

  async function handleAnalyze() {
    if (totalItemCount < MIN_ITEMS) {
      setNeedsMoreData(true);
      return;
    }

    setAnalyzing(true);
    setError(null);
    setNeedsMoreData(false);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError("Devam etmek için giriş yapmalısın.");
      setAnalyzing(false);
      return;
    }

    try {
      const res = await fetch("/api/style-assistant", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          setNeedsMoreData(true);
        } else {
          setError(json.error ?? "Analiz oluşturulurken bir hata oluştu.");
        }
        setAnalyzing(false);
        return;
      }

      setReport(json);
    } catch {
      setError("Analiz oluşturulurken bir hata oluştu.");
    }

    setAnalyzing(false);
  }

  const productById = new Map(products.map((p) => [String(p.id), p]));
  const isStale = report ? Date.now() - new Date(report.generated_at).getTime() > STALE_MS : false;

  return (
    <section className="border border-neutral-200 bg-paper p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-2">Kural Tabanlı Analiz</p>
          <h2 className="font-serif italic text-3xl text-ink">Stil Karnen ve Haftalık Planın</h2>
        </div>
        {report && (
          <span className="text-xs text-gray-400 whitespace-nowrap mt-1">
            {new Date(report.generated_at).toLocaleDateString("tr-TR")} tarihinde oluşturuldu
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor...</p>
      ) : needsMoreData ? (
        <div className="text-sm text-gray-600 leading-6">
          <p>Öneri üretmek için en az {MIN_ITEMS} ürün/kombin paylaşman gerekiyor.</p>
          <Link
            href="/sell"
            className="inline-block mt-3 text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
          >
            Hemen bir ilan paylaş →
          </Link>
        </div>
      ) : (
        <>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

          {!report ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Paylaştığın ürün ve kombinlere göre kişisel bir stil karnesi ve 5 günlük kombin
                takvimi oluşturalım.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="btn-primary disabled:opacity-40"
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={14} /> {analyzing ? "Analiz Ediliyor..." : "Analiz Et"}
                </span>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-700 leading-6 mb-8">{report.report_text}</p>

              <div className="divide-y divide-neutral-200 border-t border-neutral-200">
                {report.weekly_calendar.map((d) => (
                  <div key={d.day} className="flex items-center gap-5 py-4">
                    <span className="font-serif text-2xl text-ink w-28 shrink-0">{d.day}</span>
                    <div className="flex gap-2 shrink-0">
                      {d.product_ids.length === 0 ? (
                        <div className="w-14 h-14 bg-neutral-100" />
                      ) : (
                        d.product_ids.map((id, i) => {
                          const product = productById.get(String(id));
                          return product ? (
                            <div
                              key={`${id}-${i}`}
                              className="relative w-14 h-14 shrink-0 overflow-hidden bg-neutral-50"
                            >
                              <Image src={product.image_url} alt={product.title} fill className="object-cover" />
                            </div>
                          ) : null;
                        })
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-6 flex-1">{d.note}</p>
                  </div>
                ))}
              </div>

              {isStale && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="text-xs text-gray-500 hover:text-accent transition-colors mt-4"
                >
                  {analyzing ? "Yenileniyor..." : "Yenile"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
