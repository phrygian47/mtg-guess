// src/app/art/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Art",
  description:
    "Guess the daily Magic: The Gathering card from a pixelated art crop.",
  alternates: {
    canonical: "/art",
  },
  openGraph: {
    title: "MTGdle Art",
    description:
      "Guess the daily Magic: The Gathering card from a pixelated art crop.",
    url: "/art",
    type: "website",
  },
};

export default function ArtLayout({ children }: { children: React.ReactNode }) {
  return children;
}
