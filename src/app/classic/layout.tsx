// src/app/classic/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classic",
  description:
    "Play the classic daily MTGdle, a Magic: The Gathering card guessing game.",
  alternates: {
    canonical: "/classic",
  },
  openGraph: {
    title: "Classic MTGdle",
    description:
      "Play the classic daily MTGdle, a Magic: The Gathering card guessing game.",
    url: "/classic",
    type: "website",
  },
};

export default function ClassicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
