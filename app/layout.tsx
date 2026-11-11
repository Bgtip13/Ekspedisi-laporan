import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laporan Ekspedisi PMD",
  description: "Dashboard Laporan Ekspedisi CV Prima Mandiri Distribusi",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f172a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
