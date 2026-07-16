// app/api/salt-score/reveal/route.ts
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

  // Return JUST the scores mapped to their oracle_ids so the frontend can check the answers
  return Response.json({
    pairs: result.selection.pairs.map((pair) => ({
      pair_number: pair.pair_number,
      left: {
        oracle_id: pair.left.oracle_id,
        salt_score: pair.left.salt_score,
      },
      right: {
        oracle_id: pair.right.oracle_id,
        salt_score: pair.right.salt_score,
      },
    })),
  });
}
