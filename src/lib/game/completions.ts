import { createHash } from "crypto";

import { sql } from "@/lib/db/db";
import type { GameMode, GuessStats } from "@/lib/game/stats";
import {
  CHAIN_ORACLE_ID,
  CHAIN_SOLVABLE_ROW_COUNT,
} from "@/lib/game/chainTokens";

// Server-only. Shared by the stats and completions resources.

const MAX_GUESSES_TO_TRACK = 100;
const SALT_SCORE_ORACLE_ID = "salt-score-daily";
const SALT_SCORE_MAX_SCORE = 5;

type DistributionRow = {
  guesses: number | string;
  players: number | string;
};

export function normalizeGuessesUsed(
  value: unknown,
  mode: GameMode,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  // The zero-based modes score achievements rather than attempts, so 0 is a
  // legitimate result for them and an impossible one for classic and art.
  if (mode === "salt-score") {
    return value >= 0 && value <= SALT_SCORE_MAX_SCORE ? value : null;
  }

  if (mode === "chain-link") {
    return value >= 0 && value <= CHAIN_SOLVABLE_ROW_COUNT ? value : null;
  }

  return value >= 1 && value <= MAX_GUESSES_TO_TRACK ? value : null;
}

export function hashPlayerId(playerId: string): string {
  const salt = process.env.STATS_HASH_SALT ?? "mtgdle-classic-stats-v1";

  return createHash("sha256").update(`${salt}:${playerId}`).digest("hex");
}

/**
 * Confirms a puzzle exists for the date and that the submitted oracle id is
 * the one this mode expects, so completions cannot be recorded against a
 * puzzle that was never served.
 */
export async function verifyCompletionAnswer(
  mode: GameMode,
  puzzleDate: string,
  oracleId: string,
): Promise<{ answerFound: boolean; isValidOracleId: boolean }> {
  if (mode === "salt-score") {
    const rows = await sql`
      select id
      from multicard_game_selections
      where mode = ${mode}
        and puzzle_date = ${puzzleDate}::date
      limit 1
    `;

    return {
      answerFound: rows.length > 0,
      isValidOracleId: oracleId === SALT_SCORE_ORACLE_ID,
    };
  }

  if (mode === "chain-link") {
    const rows = await sql`
      select chain_puzzle_id
      from chain_puzzle_schedule
      where puzzle_date = ${puzzleDate}::date
      limit 1
    `;

    return {
      answerFound: rows.length > 0,
      isValidOracleId: oracleId === CHAIN_ORACLE_ID,
    };
  }

  const rows = (await sql`
    select oracle_id::text as oracle_id
    from daily_puzzles
    where mode = ${mode}
      and puzzle_date = ${puzzleDate}::date
    limit 1
  `) as { oracle_id: string }[];

  const answer = rows[0];

  return {
    answerFound: Boolean(answer),
    isValidOracleId: answer
      ? answer.oracle_id.toLowerCase() === oracleId.toLowerCase()
      : false,
  };
}

export async function insertCompletion(
  mode: GameMode,
  puzzleDate: string,
  timezone: string,
  playerId: string,
  guessesUsed: number,
) {
  await sql`
    insert into game_completions (
        mode
      , puzzle_date
      , timezone
      , player_key
      , guesses_used
    )
    values (
        ${mode}
      , ${puzzleDate}::date
      , ${timezone}
      , ${hashPlayerId(playerId)}
      , ${guessesUsed}
    )
    on conflict (mode, puzzle_date, player_key) do nothing
  `;
}

export async function getStatsForPuzzleDate(
  puzzleDate: string,
  mode: GameMode,
): Promise<GuessStats> {
  const rows = (await sql`
    select
        guesses_used as guesses
      , count(*)::int as players
    from game_completions
    where mode = ${mode}
      and puzzle_date = ${puzzleDate}::date
    group by guesses_used
    order by guesses_used
  `) as DistributionRow[];

  const rawDistribution = rows.map((row) => ({
    guesses: Number(row.guesses),
    players: Number(row.players),
  }));

  const solvedCount = rawDistribution.reduce(
    (total, bucket) => total + bucket.players,
    0,
  );
  const maxPlayers = rawDistribution.reduce(
    (max, bucket) => Math.max(max, bucket.players),
    0,
  );
  const totalGuesses = rawDistribution.reduce(
    (total, bucket) => total + bucket.guesses * bucket.players,
    0,
  );

  return {
    solvedCount,
    averageGuesses:
      solvedCount > 0 ? Number((totalGuesses / solvedCount).toFixed(1)) : null,
    distribution: rawDistribution.map((bucket) => ({
      ...bucket,
      share:
        solvedCount > 0 ? Math.round((bucket.players / solvedCount) * 100) : 0,
      barWidth:
        maxPlayers > 0 ? Math.round((bucket.players / maxPlayers) * 100) : 0,
    })),
  };
}
