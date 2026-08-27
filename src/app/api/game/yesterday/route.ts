import { sql } from "@/lib/db/db";
import { normalizeTimezone, PUZZLE_MODES } from "@/lib/game/dailyPuzzles";
import type { PuzzleMode } from "@/lib/game/dailyPuzzles";

type YesterdayRow = {
  puzzle_date: string;
  name: string;
  image_normal: string | null;
  art_crop: string | null;
  set_name: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));
    const mode = normalizeMode(searchParams.get("mode"));

    if (!mode) {
      return Response.json(
        { error: "This mode has no single daily card." },
        { status: 404 },
      );
    }

    // Read-only, and yesterday's answer is no longer a secret, so this can be
    // cached for a while. It only changes at the player's local midnight.
    const rows = (await sql`
      select
          puzzles.puzzle_date::text as puzzle_date
        , cards.name
        , cards.image_normal
        , cards.art_crop
        , cards.set_name
      from daily_puzzles puzzles
      join cards
        on cards.oracle_id = puzzles.oracle_id
      where puzzles.mode = ${mode}
        and puzzles.puzzle_date = (now() at time zone ${timezone})::date - 1
      limit 1
    `) as YesterdayRow[];

    const card = rows[0];

    if (!card) {
      return Response.json(
        { error: "No card found for yesterday." },
        { status: 404 },
      );
    }

    return Response.json(card, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/game/yesterday crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeMode(value: unknown): PuzzleMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const mode = value.trim() as PuzzleMode;

  return PUZZLE_MODES.includes(mode) ? mode : null;
}
