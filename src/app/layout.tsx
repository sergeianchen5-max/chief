import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export const metadata: Metadata = {
  title: "Шеф-холодильник — AI помощник на кухне",
  description: "Умный AI-генератор рецептов из продуктов в вашем холодильнике",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Шеф-холодильник",
  },
  icons: {
    apple: "/logo-chef.svg",
    icon: "/logo-chef.svg",
  },
};

import CookieBanner from "@/components/CookieBanner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Шеф-холодильник" />
        <link rel="apple-touch-icon" href="/logo-chef.svg" />
      </head>
      <body className={`${montserrat.variable} font-sans antialiased bg-stone-50 text-stone-900`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
