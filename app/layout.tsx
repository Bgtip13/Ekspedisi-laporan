import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laporan Ekspedisi PMD",
  description: "Dashboard Laporan Ekspedisi PMD",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
