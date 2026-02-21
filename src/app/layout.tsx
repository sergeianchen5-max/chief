import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Шеф Холодильник",
  description: "Ваш умный помощник на кухне",
  manifest: "/manifest.json",
};

import CookieBanner from "@/components/CookieBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${montserrat.variable} font-sans antialiased bg-stone-50 text-stone-900`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
