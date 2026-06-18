import { sql } from "@/lib/db/db";

const RECENT_DAYS_TO_AVOID = 180;

export const DEFAULT_DAYS_TO_PREGENERATE = 3;
export const PUZZLE_MODES = ["classic", "art"] as const;

export type PuzzleMode = (typeof PUZZLE_MODES)[number];

export type DailyPuzzleSelection = {
  mode: PuzzleMode;
  puzzle_date: string;
  oracle_id: string;
};

type OracleIdRow = {
  oracle_id: string;
};

export function getUtcDateStringPlusDays(daysToAdd: number): string {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + daysToAdd);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function normalizeTimezone(value: unknown): string {
  if (typeof value !== "string") {
    return "UTC";
  }

  return value.trim() || "UTC";
}

export async function getCurrentPuzzleDate(timezone: string): Promise<string> {
  const rows = (await sql`
    select (now() at time zone ${timezone})::date::text as puzzle_date
  `) as { puzzle_date: string }[];

  return rows[0]?.puzzle_date;
}

export async function getDailyPuzzleForDate(
  mode: PuzzleMode,
  puzzleDate: string,
): Promise<DailyPuzzleSelection | null> {
  const rows = (await sql`
    select
        mode
      , puzzle_date::text as puzzle_date
      , oracle_id::text as oracle_id
    from daily_puzzles
    where mode = ${mode}
      and puzzle_date = ${puzzleDate}::date
    limit 1
  `) as DailyPuzzleSelection[];

  return rows[0] ?? null;
}

export async function pickDailyPuzzleOracleId(
  targetDateString: string,
  mode: PuzzleMode,
): Promise<string | undefined> {
  const needsArtCrop = mode === "art";

  const freshRows = (await sql`
    select cp.oracle_id::text as oracle_id
    from card_pool cp
    join cards c
      on c.oracle_id = cp.oracle_id
    where cp.enabled = true
      and (${needsArtCrop}::boolean = false or c.art_crop is not null)
      and not exists (
        select 1
        from daily_puzzles dp
        where dp.mode = ${mode}
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
    select cp.oracle_id::text as oracle_id
    from card_pool cp
    join cards c
      on c.oracle_id = cp.oracle_id
    left join daily_puzzles dp
      on dp.mode = ${mode}
     and dp.oracle_id = cp.oracle_id
    where cp.enabled = true
      and (${needsArtCrop}::boolean = false or c.art_crop is not null)
    group by cp.oracle_id, cp.weight
    order by max(dp.puzzle_date) nulls first, random() * cp.weight desc
    limit 1
  `) as OracleIdRow[];

  return fallbackRows[0]?.oracle_id;
}

export async function ensureDailyPuzzleForDate(
  mode: PuzzleMode,
  puzzleDate: string,
): Promise<{ puzzle: DailyPuzzleSelection; created: boolean } | null> {
  const existingPuzzle = await getDailyPuzzleForDate(mode, puzzleDate);

  if (existingPuzzle) {
    return { puzzle: existingPuzzle, created: false };
  }

  const oracleId = await pickDailyPuzzleOracleId(puzzleDate, mode);

  if (!oracleId) {
    return null;
  }

  const insertedRows = (await sql`
    insert into daily_puzzles (mode, oracle_id, puzzle_date)
    values (
      ${mode},
      ${oracleId}::uuid,
      ${puzzleDate}::date
    )
    on conflict (mode, puzzle_date) do nothing
    returning
        mode
      , puzzle_date::text as puzzle_date
      , oracle_id::text as oracle_id
  `) as DailyPuzzleSelection[];

  if (insertedRows[0]) {
    return { puzzle: insertedRows[0], created: true };
  }

  const racedPuzzle = await getDailyPuzzleForDate(mode, puzzleDate);

  return racedPuzzle ? { puzzle: racedPuzzle, created: false } : null;
}

export async function ensureDailyPuzzleForTimezone(
  mode: PuzzleMode,
  timezone: string,
): Promise<{ puzzle: DailyPuzzleSelection; created: boolean } | null> {
  const puzzleDate = await getCurrentPuzzleDate(timezone);

  return ensureDailyPuzzleForDate(mode, puzzleDate);
}

export async function fillDailyPuzzleSelections({
  daysToPregenerate = DEFAULT_DAYS_TO_PREGENERATE,
  modes = PUZZLE_MODES,
}: {
  daysToPregenerate?: number;
  modes?: readonly PuzzleMode[];
} = {}) {
  const createdPuzzles: DailyPuzzleSelection[] = [];
  const reusedPuzzles: DailyPuzzleSelection[] = [];
  const missingPuzzles: { mode: PuzzleMode; puzzle_date: string }[] = [];

  for (const mode of modes) {
    for (let offset = 0; offset <= daysToPregenerate; offset++) {
      const puzzleDate = getUtcDateStringPlusDays(offset);
      const result = await ensureDailyPuzzleForDate(mode, puzzleDate);

      if (!result) {
        missingPuzzles.push({ mode, puzzle_date: puzzleDate });
        continue;
      }

      if (result.created) {
        createdPuzzles.push(result.puzzle);
      } else {
        reusedPuzzles.push(result.puzzle);
      }
    }
  }

  return {
    createdPuzzles,
    reusedPuzzles,
    missingPuzzles,
  };
}
