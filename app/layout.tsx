import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import Navbar from "./Navbar";
import Sidebar from "./components/Sidebar";
import MobileTabBar from "./components/MobileTabBar";
import PageTransition from "./components/PageTransition";
import ChatWidget from "./components/ChatWidget";
import NotificationSystem from "./components/NotificationSystem";
import BrandSplash from "./components/BrandSplash";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <Navbar />
        <Sidebar />
        <div className="lg:ml-16">
          <PageTransition>{children}</PageTransition>
        </div>
        <NotificationSystem />
        <ChatWidget />
        <MobileTabBar />
        <BrandSplash />
      </body>
    </html>
  );
}
