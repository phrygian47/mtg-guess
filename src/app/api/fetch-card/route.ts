import type { Card } from "@/lib/scryfall/types";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.scryfall.com/cards/random?q=game%3Apaper+lang%3Aen+legal%3Astandard+-is%3Apromo+-border%3Agold+-border%3silver",
      {
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Scryfall responded with error:", res.status, text);
      return Response.json({ error: "Failed to fetch card" }, { status: 500 });
    }

    const card = await res.json();

    return Response.json(card);
  } catch (err) {
    console.error("GET /api/fetch-card crashed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
