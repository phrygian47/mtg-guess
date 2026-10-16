import { ensurePriceCheckSelectionForTimezone } from "@/lib/game/priceCheckPairs";
import { normalizeTimezone } from "@/lib/game/dailyPuzzles";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));

    const selection = await ensurePriceCheckSelectionForTimezone(timezone);

    if (!selection) {
      return Response.json(
        { error: "No Price Check puzzle available." },
        { status: 404 },
      );
    }

    // Prices are deliberately left out. They only come back from /guess, one
    // pair at a time, after the player has committed to an answer.
    return Response.json({
      puzzle_date: selection.puzzle_date,
      pairs: selection.pairs.map((pair) => ({
        pair_number: pair.pair_number,
        left: { name: pair.left.name, image: pair.left.image },
        right: { name: pair.right.name, image: pair.right.image },
      })),
    });
  } catch (error) {
    console.error("GET /api/price-check/start-game crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
