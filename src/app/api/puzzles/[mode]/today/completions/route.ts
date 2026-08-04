import {
  getCurrentPuzzleDate,
  normalizeTimezone,
} from "@/lib/game/dailyPuzzles";
import {
  getStatsForPuzzleDate,
  insertCompletion,
  normalizeGuessesUsed,
  verifyCompletionAnswer,
} from "@/lib/game/completions";
import { normalizePuzzleMode } from "@/lib/game/gameModes";

type RouteContext = {
  params: Promise<{ mode: string }>;
};

type CompletionBody = {
  timezone?: unknown;
  oracleId?: unknown;
  playerId?: unknown;
  guessesUsed?: unknown;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const { mode: rawMode } = await context.params;
    const mode = normalizePuzzleMode(rawMode);

    if (!mode) {
      return Response.json({ error: "Unknown game mode." }, { status: 404 });
    }

    const body = (await req.json()) as CompletionBody;
    const timezone = normalizeTimezone(body.timezone);
    const oracleId = normalizeString(body.oracleId);
    const playerId = normalizeString(body.playerId);
    const guessesUsed = normalizeGuessesUsed(body.guessesUsed, mode);

    if (!oracleId) {
      return Response.json({ error: "Missing oracleId." }, { status: 400 });
    }

    if (!playerId) {
      return Response.json({ error: "Missing playerId." }, { status: 400 });
    }

    if (guessesUsed == null) {
      return Response.json(
        { error: "guessesUsed is outside the range this mode allows." },
        { status: 400 },
      );
    }

    const puzzleDate = await getCurrentPuzzleDate(timezone);
    const { answerFound, isValidOracleId } = await verifyCompletionAnswer(
      mode,
      puzzleDate,
      oracleId,
    );

    if (!answerFound) {
      return Response.json(
        { error: "No puzzle found for today." },
        { status: 404 },
      );
    }

    if (!isValidOracleId) {
      return Response.json(
        { error: "Completions can only be recorded for the winning card." },
        { status: 400 },
      );
    }

    await insertCompletion(mode, puzzleDate, timezone, playerId, guessesUsed);

    // The created completion is not itself addressable, so the useful
    // representation to hand back is the distribution it just joined.
    return Response.json(await getStatsForPuzzleDate(puzzleDate, mode), {
      status: 201,
    });
  } catch (error) {
    console.error("POST /api/puzzles/[mode]/today/completions crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
