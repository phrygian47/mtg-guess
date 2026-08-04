import {
  getCurrentPuzzleDate,
  normalizeTimezone,
} from "@/lib/game/dailyPuzzles";
import { getArtPuzzleForDate } from "@/lib/game/puzzleReads";
import { getSaltScoreSelectionForDate } from "@/lib/game/saltScorePairs";
import { getChainPuzzleForDate } from "@/lib/game/chainPuzzles";
import { toPublicRow } from "@/lib/game/chainTokens";
import { normalizePuzzleMode } from "@/lib/game/gameModes";

type RouteContext = {
  params: Promise<{ mode: string }>;
};

const NOT_FOUND = Response.json(
  { error: "No puzzle available for today." },
  { status: 404 },
);

export async function GET(req: Request, context: RouteContext) {
  try {
    const { mode: rawMode } = await context.params;
    const mode = normalizePuzzleMode(rawMode);

    if (!mode) {
      return Response.json({ error: "Unknown game mode." }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));
    const puzzleDate = await getCurrentPuzzleDate(timezone);

    if (mode === "art") {
      const puzzle = await getArtPuzzleForDate(puzzleDate);

      if (!puzzle?.art_crop) {
        return NOT_FOUND;
      }

      return Response.json({
        puzzle_date: puzzle.puzzle_date,
        art_crop: puzzle.art_crop,
      });
    }

    if (mode === "salt-score") {
      const selection = await getSaltScoreSelectionForDate(puzzleDate);

      if (!selection) {
        return NOT_FOUND;
      }

      return Response.json({
        puzzle_date: selection.puzzle_date,
        pairs: selection.pairs.map((pair) => ({
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

    if (mode === "chain-link") {
      const puzzle = await getChainPuzzleForDate(puzzleDate);

      if (!puzzle) {
        return NOT_FOUND;
      }

      return Response.json({
        puzzle_date: puzzle.puzzle_date,
        // Row 0 is the seed and ships fully revealed. Every other row leaks
        // only its length and first letter; the answers stay on the server.
        rows: puzzle.steps.map((step) =>
          toPublicRow(
            step.position,
            step.token,
            step.position === 0 ? step.token.length : 1,
          ),
        ),
      });
    }

    // Classic has no puzzle to hand out: the player probes it with guesses.
    return Response.json(
      { error: "This mode has no daily puzzle resource." },
      { status: 404 },
    );
  } catch (error) {
    console.error("GET /api/puzzles/[mode]/today crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
