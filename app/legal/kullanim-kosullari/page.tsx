import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları — Neith",
  description: "Neith'i kullanırken geçerli olan kurallar ve sorumluluklar.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper pt-24 pb-20 px-6">
      <article className="max-w-2xl mx-auto">
        <p className="section-label mb-3">Yasal</p>
        <h1 className="font-serif italic text-4xl text-ink mb-2">Kullanım Koşulları</h1>
        <p className="text-sm text-gray-500 mb-12">
          Bu sayfa taslak niteliğindedir ve hukuki danışmanlık yerine geçmez. Neith&apos;i
          kullanarak aşağıdaki koşulları kabul etmiş olursun.
        </p>

        <div className="prose-legal space-y-10 text-[15px] leading-relaxed text-ink/90">
          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">1. Platformun niteliği</h2>
            <p>
              Neith bir sosyal ticaret platformudur: kullanıcıların kombin ve stil paylaşabildiği,
              aynı zamanda ikinci el ürünlerini satışa çıkarabildiği bir topluluktur. İkinci el
              satış işlemleri, satıcı ve alıcı kullanıcılar arasında doğrudan gerçekleşir. Neith,
              şu an için bir ödeme veya emanet (escrow) hizmeti sunmamaktadır — ödeme, teslimat ve
              ürün durumu ile ilgili anlaşma tamamen taraflar arasındadır.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">2. Yasaklı içerik ve davranışlar</h2>
            <p className="mb-3">Platformda aşağıdakiler kesinlikle yasaktır:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Sahte veya taklit marka ürünlerin satışı</li>
              <li>Yasa dışı ürünlerin paylaşımı veya satışı</li>
              <li>Taciz, nefret söylemi veya ayrımcı içerik</li>
              <li>Spam, yanıltıcı ilan veya sahte etkileşim</li>
            </ul>
            <p className="mt-3">
              Bu kurallara uymayan içerikler kaldırılabilir ve ilgili hesaplar hakkında işlem
              yapılabilir.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">3. Hesap sorumluluğu ve yaş sınırı</h2>
            <p>
              Neith&apos;e yalnızca 18 yaşını doldurmuş kişiler hesap açabilir. Hesabının
              güvenliğinden (şifre, oturum) sen sorumlusun; hesabın üzerinden yapılan tüm
              paylaşım ve işlemlerden sorumlu tutulursun.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">4. Fikri mülkiyet</h2>
            <p>
              Paylaştığın fotoğraf, metin ve diğer içerikler sana aittir. Bu içerikleri Neith
              üzerinde paylaşarak, platformun bu içerikleri uygulama içinde (akış, profil,
              arama, öneri gibi alanlarda) gösterim amacıyla kullanmasına izin vermiş olursun. Bu
              izin, mülkiyet hakkını devretmez.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">5. Hesap askıya alma ve sonlandırma</h2>
            <p>
              Kullanım koşullarını ihlal eden hesaplar uyarılabilir, askıya alınabilir veya
              kalıcı olarak kapatılabilir. Bir kullanıcı veya içerikle ilgili sorun yaşarsan
              platform içindeki şikayet sistemini kullanarak bildirimde bulunabilirsin.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">6. Sorumluluk sınırlaması</h2>
            <p>
              Neith, platformu &quot;olduğu gibi&quot; sunar. İkinci el ürünlerin durumu, kalitesi
              ve satış sürecinin tamamlanması taraflar arasındaki bir konudur; Neith bu süreçte
              taraf değildir ve satılan ürünlerin doğruluğunu, kalitesini veya teslimatını garanti
              etmez.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">7. İlgili sayfalar</h2>
            <p>
              Kişisel verilerinin nasıl işlendiğini{" "}
              <Link href="/legal/kvkk" className="underline hover:text-accent">
                KVKK Aydınlatma Metni
              </Link>
              &apos;nde, çerez kullanımını{" "}
              <Link href="/legal/cerezler" className="underline hover:text-accent">
                Çerez Politikası
              </Link>
              &apos;nda bulabilirsin.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
