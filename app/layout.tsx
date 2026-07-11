import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Navbar from "./Navbar";
import Sidebar from "./components/Sidebar";
import MobileTabBar from "./components/MobileTabBar";
import PageTransition from "./components/PageTransition";
import NotificationSystem from "./components/NotificationSystem";
import BrandSplash from "./components/BrandSplash";
import InviteConsumer from "./components/InviteConsumer";
import ComposePostHost from "./components/ComposePostHost";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Neith — Stilini Paylaş",
  description: "Kombinlerini paylaş, gardırobunu keşfet: ikinci el moda ve stil topluluğu.",
};

// Tema cookie'sini ilk boyamadan önce okuyup .dark sınıfını basar — SSR
// çıktısı statik kalır (cookies() ile dinamikleştirmeden) ama flash olmaz.
const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light|system)/);var t=m?m[1]:"system";if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${playfair.variable} ${inter.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <Navbar />
        <Sidebar />
        <div className="lg:ml-16">
          <PageTransition>{children}</PageTransition>
        </div>
        <NotificationSystem />
        <MobileTabBar />
        <BrandSplash />
        <InviteConsumer />
        <ComposePostHost />
      </body>
    </html>
  );
}
