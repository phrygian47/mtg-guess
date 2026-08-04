import {
  getCurrentPuzzleDate,
  normalizeTimezone,
} from "@/lib/game/dailyPuzzles";
import { getSaltScoreSelectionForDate } from "@/lib/game/saltScorePairs";
import { normalizePuzzleMode } from "@/lib/game/gameModes";

type RouteContext = {
  params: Promise<{ mode: string }>;
};

export async function GET(req: Request, context: RouteContext) {
  try {
    const { mode: rawMode } = await context.params;
    const mode = normalizePuzzleMode(rawMode);

    if (mode !== "salt-score") {
      return Response.json(
        { error: "This mode has no scores resource." },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));
    const puzzleDate = await getCurrentPuzzleDate(timezone);
    const selection = await getSaltScoreSelectionForDate(puzzleDate);

    if (!selection) {
      return Response.json(
        { error: "No salt score puzzle available." },
        { status: 404 },
      );
    }

    // Just the scores keyed by oracle_id, so the client can grade its pick.
    return Response.json({
      pairs: selection.pairs.map((pair) => ({
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
  } catch (error) {
    console.error("GET /api/puzzles/[mode]/today/scores crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
