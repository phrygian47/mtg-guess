import { sql } from "@/lib/db/db";

const RECENT_DAYS_TO_AVOID = 180;
const DAYS_AHEAD_TO_KEEP_READY = 3;

const MODES = ["classic", "art"] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type PuzzleMode = (typeof MODES)[number];
type DailyPuzzleRow = {
  mode: PuzzleMode;
  oracle_id: string;
  puzzle_date: string;
};
type ModeReadyResult = Awaited<ReturnType<typeof ensureModeReady>>;

function getUtcDateStringPlusDays(daysToAdd: number): string {
  const date = new Date();

  date.setUTCDate(date.getUTCDate() + daysToAdd);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function pickOracleId(targetDateString: string, mode: PuzzleMode) {
  const freshRows = await sql`
    select cp.oracle_id
    from card_pool cp
    where cp.enabled = true
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
  `;

  if (freshRows.length > 0) {
    return freshRows[0]?.oracle_id as string;
  }

  const fallbackRows = await sql`
    select cp.oracle_id
    from card_pool cp
    left join daily_puzzles dp
      on dp.mode = ${mode}
     and dp.oracle_id = cp.oracle_id
    where cp.enabled = true
    group by cp.oracle_id, cp.weight
    order by max(dp.puzzle_date) nulls first, random() * cp.weight desc
    limit 1
  `;

  return fallbackRows[0]?.oracle_id as string | undefined;
}

async function getPuzzleForDate(targetDateString: string, mode: PuzzleMode) {
  const rows = await sql`
    select *
    from daily_puzzles
    where mode = ${mode}
      and puzzle_date = ${targetDateString}::date
    limit 1
  `;

  return rows[0] as DailyPuzzleRow | undefined;
}

async function createPuzzleForDate(targetDateString: string, mode: PuzzleMode) {
  const oracleId = await pickOracleId(targetDateString, mode);

  if (!oracleId) {
    throw new Error(
      `No eligible card found for ${mode} on ${targetDateString}.`,
    );
  }

  const rows = await sql`
    insert into daily_puzzles (mode, oracle_id, puzzle_date)
    values (
      ${mode},
      ${oracleId}::uuid,
      ${targetDateString}::date
    )
    on conflict (mode, puzzle_date) do nothing
    returning *
  `;

  return rows[0] as DailyPuzzleRow | undefined;
}

async function ensureModeReady(mode: PuzzleMode) {
  const createdCards: DailyPuzzleRow[] = [];
  const existingCards: DailyPuzzleRow[] = [];
  const checkedDates: string[] = [];

  for (let offset = 0; offset <= DAYS_AHEAD_TO_KEEP_READY; offset++) {
    const targetDateString = getUtcDateStringPlusDays(offset);
    checkedDates.push(targetDateString);

    const existingPuzzle = await getPuzzleForDate(targetDateString, mode);

    if (existingPuzzle) {
      existingCards.push(existingPuzzle);
      continue;
    }

    const createdPuzzle = await createPuzzleForDate(targetDateString, mode);

    if (createdPuzzle) {
      createdCards.push(createdPuzzle);
      continue;
    }

    const racedPuzzle = await getPuzzleForDate(targetDateString, mode);

    if (racedPuzzle) {
      existingCards.push(racedPuzzle);
      continue;
    }

    throw new Error(`Failed to create ${mode} puzzle for ${targetDateString}.`);
  }

  return {
    mode,
    checkedDates,
    readyThroughDate: checkedDates[checkedDates.length - 1],
    createdCards,
    existingCards,
  };
}

export async function GET(req: Request) {
  const schedule = req.headers.get("x-vercel-cron-schedule");
  const userAgent = req.headers.get("user-agent");
  let cronRunId: number | null = null;

  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    await sql`
      insert into cron_runs (
        job, status, finished_at, http_status, schedule, user_agent, error
      )
      values (
        'select-from-card-pool',
        'unauthorized',
        now(),
        401,
        ${schedule},
        ${userAgent},
        'Authorization header did not match CRON_SECRET'
      )
    `;

    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const runRows = await sql`
      insert into cron_runs (job, status, schedule, user_agent)
      values (
        'select-from-card-pool',
        'started',
        ${schedule},
        ${userAgent}
      )
      returning id
    `;

    cronRunId = Number(runRows[0]?.id);

    const modeResults: ModeReadyResult[] = [];

    for (const mode of MODES) {
      modeResults.push(await ensureModeReady(mode));
    }

    const createdCards = modeResults.flatMap((result) => result.createdCards);
    const existingCards = modeResults.flatMap((result) => result.existingCards);

    await sql`
      update cron_runs
      set
        status = 'success',
        finished_at = now(),
        http_status = 200,
        created_count = ${createdCards.length},
        existing_count = ${existingCards.length}
      where id = ${cronRunId}
    `;

    return Response.json({
      ok: true,
      createdCount: createdCards.length,
      existingCount: existingCards.length,
      reusedCount: existingCards.length,
      modes: modeResults.map((result) => ({
        mode: result.mode,
        checkedDates: result.checkedDates,
        readyThroughDate: result.readyThroughDate,
        createdCount: result.createdCards.length,
        existingCount: result.existingCards.length,
      })),
      createdCards,
      existingCards,
      reusedCards: existingCards,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (cronRunId !== null) {
      await sql`
        update cron_runs
        set
          status = 'error',
          finished_at = now(),
          http_status = 500,
          error = ${message}
        where id = ${cronRunId}
      `;
    }

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
