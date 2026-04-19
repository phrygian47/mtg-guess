import type { Card } from "@/lib/scryfall/types";

export async function fetchRandomSelectedCard(): Promise<Card> {
  const res = await fetch(
    "https://api.scryfall.com/cards/random?q=game%3Apaper+lang%3Aen+legal%3Astandard+-is%3Apromo+-border%3Agold+-border%3Asilver",
    {
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Scryfall responded with ${res.status}: ${text}`);
  }

  const card: Card = await res.json();
  return card;
}
