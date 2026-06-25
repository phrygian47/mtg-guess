import { ensureSaltScoreSelectionForTimezone } from "@/lib/game/saltScorePairs";
import { normalizeTimezone } from "@/lib/game/dailyPuzzles";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const timezone = normalizeTimezone(searchParams.get("timezone"));

  const result = await ensureSaltScoreSelectionForTimezone(timezone);

  if (!result) {
    return Response.json(
      { error: "No salt score puzzle available." },
      { status: 404 },
    );
  }

  return Response.json({
    puzzle_date: result.selection.puzzle_date,
    pairs: result.selection.pairs.map((pair) => ({
      pair_number: pair.pair_number,
      left: {
        oracle_id: pair.left.oracle_id,
        name: pair.left.name,
        image_normal: pair.left.image_normal,
      },
      right: {
        oracle_id: pair.right.oracle_id,
        name: pair.right.name,
        image_normal: pair.right.image_normal,
      },
    })),
  });
}
