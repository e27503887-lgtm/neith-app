import EditorialHub from "../components/EditorialHub";

export default function EditorialPage() {
  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="bg-white border border-neutral-200 rounded-3xl p-8 shadow-sm">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.28em] text-gray-500">Moda Dergisi</p>
            <h1 className="mt-3 text-4xl font-serif tracking-tight text-ink">Neith Editorial Hub</h1>
            <p className="mt-4 max-w-2xl text-gray-600 leading-7">Moda Haftası özetleri, canlı sohbetler ve stil rehberini tek bir editoryal merkezde sunuyoruz.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <article className="rounded-3xl border border-neutral-200 p-6 bg-ink/5">
              <h2 className="text-xl font-semibold text-ink">Moda Haftası Özetleri</h2>
              <p className="mt-3 text-sm text-gray-600">Podyum notları, sokak stili seçkileri ve editoryal röportajlarla haftayı kapsıyoruz.</p>
              <a href="/fashion-week" className="btn-primary mt-6 inline-flex">Detayları keşfet</a>
            </article>
            <article className="rounded-3xl border border-neutral-200 p-6 bg-white shadow-sm">
              <h2 className="text-xl font-semibold text-ink">Canlı Sohbet</h2>
              <p className="mt-3 text-sm text-gray-600">Tasarımcı sohbetleri, trend analizi ve sahne arkası içerikler için buradasınız.</p>
              <a href="/messages" className="inline-flex mt-6 rounded-full border border-ink px-4 py-2 text-sm font-medium text-ink hover:bg-ink hover:text-paper transition-colors">Sohbete katıl</a>
            </article>
          </div>
        </section>

        <EditorialHub />
      </div>
    </main>
  );
}
