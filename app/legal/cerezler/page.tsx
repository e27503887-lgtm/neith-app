import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası — Neith",
  description: "Neith hangi çerezleri hangi amaçla kullanır.",
};

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-paper pt-24 pb-20 px-6">
      <article className="max-w-2xl mx-auto">
        <p className="section-label mb-3">Yasal</p>
        <h1 className="font-serif italic text-4xl text-ink mb-2">Çerez Politikası</h1>
        <p className="text-sm text-gray-500 mb-12">
          Bu sayfa taslak niteliğindedir ve hukuki danışmanlık yerine geçmez.
        </p>

        <div className="prose-legal space-y-10 text-[15px] leading-relaxed text-ink/90">
          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">1. Kullandığımız çerezler</h2>
            <ul className="list-disc pl-5 space-y-3">
              <li>
                <span className="font-medium text-ink">Oturum çerezi (Supabase Auth):</span>{" "}
                Giriş yaptığında oturumunu açık tutmak için kullanılır. Bu çerez olmadan her
                sayfa yenilemesinde tekrar giriş yapman gerekir.
              </li>
              <li>
                <span className="font-medium text-ink">Tema tercihi:</span> Karanlık veya aydınlık
                mod seçimini hatırlamak için kullanılır.
              </li>
              <li>
                <span className="font-medium text-ink">Davet kodu:</span> Tarayıcının oturum
                belleğinde (sessionStorage) geçici olarak tutulur; teknik olarak bir çerez
                değildir ve sekme kapandığında silinir, yalnızca kayıt sürecini tamamlamana
                yardımcı olur.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">2. Üçüncü taraf çerezler</h2>
            <p>
              Neith, reklam veya takip amaçlı herhangi bir üçüncü taraf çerezi kullanmaz.
              Kullandığımız tüm çerezler, platformun temel işlevlerini (giriş, tema tercihi)
              çalıştırmak içindir.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
