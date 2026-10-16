import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price Check",
  description:
    "Play MTG Price Check, a daily game: guess which costs more, a Magic: The Gathering card or an everyday item.",
  alternates: {
    canonical: "/price-check",
  },
  openGraph: {
    title: "MTG Price Check",
    description:
      "Guess which costs more, a Magic: The Gathering card or an everyday item.",
    url: "/price-check",
    type: "website",
  },
};

export default function PriceCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
