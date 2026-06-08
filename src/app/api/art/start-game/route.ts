import { sql } from "@/lib/db/db";

const MODE = "art";
const RECENT_DAYS_TO_AVOID = 180;

type PuzzleDateRow = {
  puzzle_date: string;
};

type ArtPuzzleRow = {
  puzzle_date: string;
  art_crop: string | null;
};

type OracleIdRow = {
  oracle_id: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));
    const puzzleDate = await getCurrentPuzzleDate(timezone);
    const puzzle = await ensureArtPuzzleForDate(puzzleDate);

    if (!puzzle) {
      return Response.json(
        { error: "No eligible art puzzle card found." },
        { status: 404 },
      );
    }

    if (!puzzle.art_crop) {
      return Response.json(
        { error: "Today's art puzzle is missing an art crop." },
        { status: 404 },
      );
    }

    return Response.json({
      puzzle_date: puzzle.puzzle_date,
      art_crop: puzzle.art_crop,
    });
  } catch (error) {
    console.error("GET /api/art/start-game crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function ensureArtPuzzleForDate(
  puzzleDate: string,
): Promise<ArtPuzzleRow | null> {
  const existingPuzzle = await getArtPuzzleForDate(puzzleDate);

  if (existingPuzzle) {
    return existingPuzzle;
  }

  const oracleId = await pickOracleId(puzzleDate);

  if (!oracleId) {
    return null;
  }

  await sql`
    insert into daily_puzzles (mode, puzzle_date, oracle_id)
    values (${MODE}, ${puzzleDate}::date, ${oracleId}::uuid)
    on conflict (mode, puzzle_date) do nothing
  `;

  return getArtPuzzleForDate(puzzleDate);
}

async function getArtPuzzleForDate(
  puzzleDate: string,
): Promise<ArtPuzzleRow | null> {
  const rows = (await sql`
    select
        dp.puzzle_date::text as puzzle_date
      , c.art_crop
    from daily_puzzles dp
    join cards c
      on c.oracle_id = dp.oracle_id
    where dp.mode = ${MODE}
      and dp.puzzle_date = ${puzzleDate}::date
    limit 1
  `) as ArtPuzzleRow[];

  return rows[0] ?? null;
}

async function pickOracleId(targetDateString: string) {
  const freshRows = (await sql`
    select cp.oracle_id
    from card_pool cp
    join cards c
      on c.oracle_id = cp.oracle_id
    where cp.enabled = true
      and c.art_crop is not null
      and not exists (
        select 1
        from daily_puzzles dp
        where dp.mode = ${MODE}
          and dp.oracle_id = cp.oracle_id
          and dp.puzzle_date >= (${targetDateString}::date - ${RECENT_DAYS_TO_AVOID}::int)
          and dp.puzzle_date < ${targetDateString}::date
      )
    order by random() * cp.weight desc
    limit 1
  `) as OracleIdRow[];

  if (freshRows.length > 0) {
    return freshRows[0]?.oracle_id;
  }

  const fallbackRows = (await sql`
    select cp.oracle_id
    from card_pool cp
    join cards c
      on c.oracle_id = cp.oracle_id
    left join daily_puzzles dp
      on dp.mode = ${MODE}
     and dp.oracle_id = cp.oracle_id
    where cp.enabled = true
      and c.art_crop is not null
    group by cp.oracle_id, cp.weight
    order by max(dp.puzzle_date) nulls first, random() * cp.weight desc
    limit 1
  `) as OracleIdRow[];

  return fallbackRows[0]?.oracle_id;
}

async function getCurrentPuzzleDate(timezone: string): Promise<string> {
  const rows = (await sql`
    select (now() at time zone ${timezone})::date::text as puzzle_date
  `) as PuzzleDateRow[];

  return rows[0]?.puzzle_date;
}

function normalizeTimezone(value: unknown): string {
  if (typeof value !== "string") {
    return "UTC";
  }

  return value.trim() || "UTC";
}
