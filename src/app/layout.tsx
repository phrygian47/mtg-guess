import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Header from "@/components/Header/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mtgdle.net"),
  title: {
    default: "MTGdle",
    template: "%s | MTGdle",
  },
  icons: {
    icon: "/favicon.svg",
  },
  description: "A daily Magic: The Gathering card guessing game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link
          rel="preload"
          as="image"
          href="/card_back.webp"
          type="image/webp"
        />
      </head>
      <body>
        <header>
          <Header />
        </header>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
