import Image from "next/image";
import { supabase } from "../../utils/supabase";
import { getArticleCategoryLabel } from "@/lib/articleCategories";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  const { data: article } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!article) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Makale bulunamadı.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <article className="max-w-3xl mx-auto">
        {article.cover_image_url && (
          <div className="relative w-full aspect-[16/9] mb-8 bg-neutral-100 overflow-hidden">
            <Image src={article.cover_image_url} alt={article.title} fill className="object-cover" />
          </div>
        )}

        <p className="text-xs uppercase tracking-[0.24em] text-accent mb-3">
          {getArticleCategoryLabel(article.category)}
        </p>
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink mb-3">{article.title}</h1>
        <p className="text-sm text-gray-400 mb-10">
          {new Date(article.created_at).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        {article.excerpt && (
          <p className="text-lg text-gray-600 leading-8 mb-8 font-serif italic">{article.excerpt}</p>
        )}

        {article.content && (
          <div className="text-sm text-gray-700 leading-7 whitespace-pre-wrap">{article.content}</div>
        )}
      </article>
    </main>
  );
}
