import {
  getCurrentPuzzleDate,
  normalizeTimezone,
} from "@/lib/game/dailyPuzzles";
import { getStatsForPuzzleDate } from "@/lib/game/completions";
import { normalizePuzzleMode } from "@/lib/game/gameModes";

type RouteContext = {
  params: Promise<{ mode: string }>;
};

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

    return Response.json(await getStatsForPuzzleDate(puzzleDate, mode));
  } catch (error) {
    console.error("GET /api/puzzles/[mode]/today/stats crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
