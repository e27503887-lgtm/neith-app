import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — Neith",
  description: "Neith kişisel verilerinizi hangi amaçla, nasıl işler ve saklar.",
};

export default function KvkkPage() {
  return (
    <main className="min-h-screen bg-paper pt-24 pb-20 px-6">
      <article className="max-w-2xl mx-auto">
        <p className="section-label mb-3">Yasal</p>
        <h1 className="font-serif italic text-4xl text-ink mb-2">KVKK Aydınlatma Metni</h1>
        <p className="text-sm text-gray-500 mb-12">
          Bu sayfa 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında bilgilendirme
          amacıyla hazırlanmış bir taslaktır; hukuki danışmanlık yerine geçmez.
        </p>

        <div className="prose-legal space-y-10 text-[15px] leading-relaxed text-ink/90">
          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">1. Hangi verileri topluyoruz?</h2>
            <p className="mb-3">
              Neith&apos;i kullanırken aşağıdaki kişisel verilerini işleriz:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>E-posta adresi (hesap oluşturma ve giriş için)</li>
              <li>Kullanıcı adı ve profil bilgileri (bio, profil fotoğrafı)</li>
              <li>
                Beden ve stil tercihleri — bunlar tamamen opsiyoneldir; dilersen paylaşmayabilir
                ya da profilinde gizli tutabilirsin
              </li>
            </ul>
            <p className="mt-3">
              Şu an için konum bilgisi toplamıyoruz. Ödeme bilgisi de toplamıyoruz — Neith&apos;te
              alım satım, kullanıcıların kendi aralarında anlaştığı bir süreçtir (bkz.{" "}
              <Link href="/legal/kullanim-kosullari" className="underline hover:text-accent">
                Kullanım Koşulları
              </Link>
              ).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">2. Verilerin nerede saklandığı</h2>
            <p>
              Verilerin, veritabanı ve kimlik doğrulama altyapısı olarak Supabase, barındırma ve
              sunucu altyapısı olarak da Vercel üzerinde saklanır. Her iki sağlayıcı da endüstri
              standardı güvenlik önlemleri uygular.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">3. Verileri hangi amaçla işliyoruz?</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Hesap oluşturma ve kimlik doğrulama</li>
              <li>Kombin ve ürün paylaşımı, ikinci el satış ilanlarının yayınlanması</li>
              <li>Kullanıcılar arası mesajlaşma</li>
              <li>Stil Asistanı üzerinden kişiselleştirilmiş öneri sunulması</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">4. Yapay zekâ kullanımı hakkında</h2>
            <p>
              Netlik için belirtmek isteriz: Stil Asistanı ve öneri sistemlerimiz, verilerini bir
              büyük dil modeline (örneğin Anthropic Claude API) göndermez. Öneriler, uygulama
              içinde çalışan kural tabanlı bir sistem tarafından üretilir; verilerin üçüncü bir
              yapay zekâ sağlayıcısına aktarılması söz konusu değildir.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">5. Haklarınız</h2>
            <p className="mb-3">KVKK kapsamında şu haklara sahipsin:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Verilerinin işlenip işlenmediğini öğrenme ve erişim talep etme</li>
              <li>Eksik veya yanlış verilerin düzeltilmesini isteme</li>
              <li>Verilerinin silinmesini isteme — hesabını dilediğin an kalıcı olarak silebilirsin</li>
              <li>İşlenen verilere itiraz etme</li>
            </ul>
            <p className="mt-3">
              Hesabını ve tüm kişisel verilerini silmek için{" "}
              <Link href="/profile/edit" className="underline hover:text-accent">
                profil ayarları
              </Link>{" "}
              sayfasındaki hesap silme özelliğini kullanabilirsin.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-ink mb-3">6. İletişim</h2>
            <p>
              Verilerinle ilgili sorular için hesabına bağlı e-posta adresinden bize
              ulaşabilirsin.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
