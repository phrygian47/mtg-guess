import { ensurePriceCheckSelectionForTimezone } from "@/lib/game/priceCheckPairs";
import { normalizeTimezone } from "@/lib/game/dailyPuzzles";

type GuessBody = {
  timezone?: unknown;
  pair_number?: unknown;
  side?: unknown;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GuessBody;
    const timezone = normalizeTimezone(body.timezone);
    const pairNumber = body.pair_number;
    const side = body.side;

    if (typeof pairNumber !== "number" || !Number.isInteger(pairNumber)) {
      return Response.json({ error: "Bad pair_number." }, { status: 400 });
    }

    if (side !== "left" && side !== "right") {
      return Response.json(
        { error: "side must be left or right." },
        { status: 400 },
      );
    }

    const selection = await ensurePriceCheckSelectionForTimezone(timezone);
    const pair = selection?.pairs.find((p) => p.pair_number === pairNumber);

    if (!pair) {
      return Response.json({ error: "Pair not found." }, { status: 404 });
    }

    const chosen = pair[side].price_cents;
    const other = pair[side === "left" ? "right" : "left"].price_cents;

    return Response.json({
      pair_number: pair.pair_number,
      correct: chosen > other,
      left_price_cents: pair.left.price_cents,
      right_price_cents: pair.right.price_cents,
    });
  } catch (error) {
    console.error("POST /api/price-check/guess crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
