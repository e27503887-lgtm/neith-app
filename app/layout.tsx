import Navbar from "./Navbar"; 
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}