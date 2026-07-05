"use client";

import Link from "next/link";
import { MessageCircle, Sparkles, CalendarDays } from "lucide-react";

type Story = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
};

const stories: Story[] = [
  {
    id: "s1",
    title: "Moda Haftası: Haftanın En İyi 5 Kombini",
    excerpt: "Yeni sezonun en cesur sokak stillerini, podyumdan aldığımız detaylarla bir araya getirdik.",
    category: "Özet",
  },
  {
    id: "s2",
    title: "Stil Kılavuzu: Minimalist Yaz Katmanları",
    excerpt: "Hafif dokular, sıcak tonlar ve akıcı çizgilerle editoryal bir görünüm yaratın.",
    category: "Trend",
  },
  {
    id: "s3",
    title: "Sahne Arkası: Tasarımcılarla Canlı Sohbet",
    excerpt: "Marka isimleriyle gerçekleştirdiğimiz özel röportajlarla trendlerin perde arkasına bakıyoruz.",
    category: "Röportaj",
  },
];

export default function EditorialHub() {
  return (
    <aside className="bg-paper border border-neutral-200 rounded-3xl overflow-hidden">
      <div className="bg-ink text-paper px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-neutral-300">Moda Dergisi</p>
            <h2 className="mt-2 text-2xl font-serif tracking-tight">Editorial Hub</h2>
          </div>
          <div className="rounded-full bg-white/10 p-2">
            <Sparkles size={22} className="text-paper" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="rounded-3xl bg-black/5 p-4">
          <div className="flex items-center gap-3 text-sm uppercase tracking-[0.24em] text-gray-500 mb-3">
            <CalendarDays size={16} />
            Moda Haftası Özetleri
          </div>
          <div className="space-y-4">
            {stories.slice(0, 2).map((story) => (
              <div key={story.id} className="rounded-3xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <p className="text-xs uppercase tracking-[0.24em] text-accent mb-2">{story.category}</p>
                <h3 className="text-lg font-semibold text-ink leading-tight">{story.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{story.excerpt}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Canlı Sohbet</p>
              <h3 className="text-lg font-semibold text-ink">Toplantıya Katıl</h3>
            </div>
            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
              <MessageCircle size={18} />
            </div>
          </div>
          <p className="text-sm text-gray-600 leading-6">Moda Haftası ekibiyle özel sohbetler, güncel röportajlar ve sahne arkası anları için bu panoyu takip edin.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/messages" className="inline-flex items-center justify-center rounded-full bg-ink text-paper px-4 py-2 text-sm font-medium hover:bg-gray-900">
              Canlı Sohbete Katıl
            </Link>
            <Link href="/fashion-week" className="text-sm font-medium text-accent hover:text-black">
              Moda Haftası detaylarına git →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
