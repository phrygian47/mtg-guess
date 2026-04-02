import type { Card } from "@/lib/scryfall/types";
import { toCardShape } from "@/lib/scryfall/toCardShape";

export async function GET() {
  const res = await fetch("https://api.scryfall.com/cards/random", {
    cache: "no-store",
  });
  if (!res.ok) {
    return Response.json({ error: "Failed to fetch card" }, { status: 500 });
  }
  const data = await res.json();
  const card: Card = toCardShape(data);

  return Response.json(card);
}
