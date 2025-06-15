import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "NFT Garden",
  description: "Kişisel NFT bahçenizi oluşturun ve büyütün.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
