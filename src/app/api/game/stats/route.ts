import { createHash } from "crypto";

import { sql } from "@/lib/db/db";
import type { GuessStats } from "@/lib/game/stats";

type CompletionBody = {
  timezone?: unknown;
  oracleId?: unknown;
  playerId?: unknown;
  guessesUsed?: unknown;
};

type PuzzleDateRow = {
  puzzle_date: string;
};

type AnswerRow = {
  oracle_id: string;
};

type DistributionRow = {
  guesses: number | string;
  players: number | string;
};

const MODE = "classic";
const MAX_GUESSES_TO_TRACK = 100;

let ensureStatsTablePromise: Promise<void> | null = null;

function ensureStatsTable() {
  ensureStatsTablePromise ??= (async () => {
    await sql`
      create table if not exists game_completions (
        id bigserial primary key,
        mode text not null default 'classic',
        puzzle_date date not null,
        timezone text not null,
        player_key text not null,
        guesses_used integer not null check (
          guesses_used >= 1
          and guesses_used <= 100
        ),
        created_at timestamptz not null default now(),
        unique (mode, puzzle_date, player_key)
      )
    `;

    await sql`
      create index if not exists game_completions_daily_guess_idx
      on game_completions (mode, puzzle_date, guesses_used)
    `;
  })();

  return ensureStatsTablePromise;
}

export async function GET(req: Request) {
  try {
    await ensureStatsTable();

    const { searchParams } = new URL(req.url);
    const timezone = normalizeTimezone(searchParams.get("timezone"));
    const puzzleDate = await getCurrentPuzzleDate(timezone);

    return Response.json(await getStatsForPuzzleDate(puzzleDate));
  } catch (error) {
    console.error("GET /api/game/stats crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CompletionBody;
    const timezone = normalizeTimezone(body.timezone);
    const oracleId = normalizeString(body.oracleId);
    const playerId = normalizeString(body.playerId);
    const guessesUsed = normalizeGuessesUsed(body.guessesUsed);

    if (!oracleId) {
      return Response.json({ error: "Missing oracleId." }, { status: 400 });
    }

    if (!playerId) {
      return Response.json({ error: "Missing playerId." }, { status: 400 });
    }

    if (guessesUsed == null) {
      return Response.json(
        { error: "guessesUsed must be an integer from 1 to 100." },
        { status: 400 },
      );
    }

    await ensureStatsTable();

    const puzzleDate = await getCurrentPuzzleDate(timezone);
    const answerRows = (await sql`
      select oracle_id
      from card_history
      where puzzle_date = ${puzzleDate}::date
      limit 1
    `) as AnswerRow[];
    const answer = answerRows[0];

    if (!answer) {
      return Response.json(
        { error: "No puzzle card found for today." },
        { status: 404 },
      );
    }

    if (answer.oracle_id.toLowerCase() !== oracleId.toLowerCase()) {
      return Response.json(
        { error: "Stats can only be recorded for the winning card." },
        { status: 400 },
      );
    }

    await sql`
      insert into game_completions (
        mode,
        puzzle_date,
        timezone,
        player_key,
        guesses_used
      )
      values (
        ${MODE},
        ${puzzleDate}::date,
        ${timezone},
        ${hashPlayerId(playerId)},
        ${guessesUsed}
      )
      on conflict (mode, puzzle_date, player_key) do nothing
    `;

    return Response.json(await getStatsForPuzzleDate(puzzleDate));
  } catch (error) {
    console.error("POST /api/game/stats crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeTimezone(value: unknown): string {
  if (typeof value !== "string") {
    return "UTC";
  }

  return value.trim() || "UTC";
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeGuessesUsed(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value < 1 || value > MAX_GUESSES_TO_TRACK) {
    return null;
  }

  return value;
}

function hashPlayerId(playerId: string): string {
  const salt = process.env.STATS_HASH_SALT ?? "mtgdle-classic-stats-v1";

  return createHash("sha256").update(`${salt}:${playerId}`).digest("hex");
}

async function getCurrentPuzzleDate(timezone: string): Promise<string> {
  const rows = (await sql`
    select (now() at time zone ${timezone})::date::text as puzzle_date
  `) as PuzzleDateRow[];

  return rows[0]?.puzzle_date;
}

async function getStatsForPuzzleDate(puzzleDate: string): Promise<GuessStats> {
  const rows = (await sql`
    select
        guesses_used as guesses
      , count(*)::int as players
    from game_completions
    where mode = ${MODE}
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
