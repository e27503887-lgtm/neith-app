import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Syne, Inter } from "next/font/google";
import Navbar from "./Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import MobileTabBar from "./components/MobileTabBar";
import PageTransition from "./components/PageTransition";
import NotificationSystem from "./components/NotificationSystem";
import BrandSplash from "./components/BrandSplash";
import InviteConsumer from "./components/InviteConsumer";
import ComposePostHost from "./components/ComposePostHost";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import InstallPWAButton from "./components/InstallPWAButton";
import "./globals.css";

// Başlık fontu: Syne (700–800). Değişken font olduğundan weight belirtmeye
// gerek yok; --font-syne değişkeni globals.css'te --font-serif'e bağlanır.
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = "https://neithapp.com.tr";
const DEFAULT_TITLE = "Neith — Stilini Paylaş, Gardırobunu Sat";
const DEFAULT_DESCRIPTION =
  "Kombinlerini paylaş, ilham al, ikinci el gardırobunu sat. Moda ve sosyal ticaretin buluştuğu yer.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: "Neith",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-default.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Neith",
  },
};

export const viewport: Viewport = {
  themeColor: "#303539",
};

// Tema cookie'sini ilk boyamadan önce okuyup .dark sınıfını basar — SSR
// çıktısı statik kalır (cookies() ile dinamikleştirmeden) ama flash olmaz.
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light|system)/);var t=m?m[1]:"system";if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${syne.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Navbar />
        <Sidebar />
        <div className="lg:ml-16 flex min-h-screen flex-col">
          <div className="flex-1">
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
        </div>
        <NotificationSystem />
        <MobileTabBar />
        <BrandSplash />
        <InviteConsumer />
        <ComposePostHost />
        <ServiceWorkerRegister />
        <InstallPWAButton />
        <Analytics />
      </body>
    </html>
  );
}
