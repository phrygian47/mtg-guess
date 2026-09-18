import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

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
  openGraph: {
    title: "MTGdle",
    description: "A daily Magic: The Gathering card guessing game.",
    url: "/",
    siteName: "MTGdle",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MTGdle - A daily Magic card guessing game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MTGdle",
    description: "A daily Magic: The Gathering card guessing game.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header>
          <Header />
        </header>
        {children}
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
