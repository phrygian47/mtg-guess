import { sql } from "@/lib/db/db";

// Server-only read paths for the daily_puzzles-backed modes.
//
// These are deliberately read-only. Puzzle generation belongs to the cron
// routes, which pregenerate DEFAULT_DAYS_TO_PREGENERATE days ahead, so a GET
// never needs to create a row as a side effect.

export type DailyPuzzleMode = "classic" | "art";

export type ArtPuzzle = {
  puzzle_date: string;
  art_crop: string | null;
};

export type DailyPuzzleAnswer = {
  oracle_id: string;
  name: string;
  image_normal: string | null;
  art_crop: string | null;
  oracle_text: string | null;
  mana_cost: string | null;
  set_name: string | null;
};

export async function getArtPuzzleForDate(
  puzzleDate: string,
): Promise<ArtPuzzle | null> {
  const rows = (await sql`
    select
        puzzles.puzzle_date::text as puzzle_date
      , cards.art_crop
    from daily_puzzles puzzles
    join cards
      on cards.oracle_id = puzzles.oracle_id
    where puzzles.mode = 'art'
      and puzzles.puzzle_date = ${puzzleDate}::date
    limit 1
  `) as ArtPuzzle[];

  return rows[0] ?? null;
}

export async function getDailyPuzzleAnswer(
  mode: DailyPuzzleMode,
  puzzleDate: string,
): Promise<DailyPuzzleAnswer | null> {
  const rows = (await sql`
    select
        puzzles.oracle_id::text as oracle_id
      , cards.name
      , cards.image_normal
      , cards.art_crop
      , cards.oracle_text
      , cards.mana_cost
      , cards.set_name
    from daily_puzzles puzzles
    join cards
      on cards.oracle_id = puzzles.oracle_id
    where puzzles.mode = ${mode}
      and puzzles.puzzle_date = ${puzzleDate}::date
    limit 1
  `) as DailyPuzzleAnswer[];

  return rows[0] ?? null;
}
