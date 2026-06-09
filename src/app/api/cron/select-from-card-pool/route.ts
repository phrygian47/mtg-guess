import { sql } from "@/lib/db/db";

const RECENT_DAYS_TO_AVOID = 180;
const DAYS_TO_PREGENERATE = 2;

const MODES = ["classic", "art"] as const;
type PuzzleMode = (typeof MODES)[number];

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

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const createdCards = [];
    const reusedCards = [];

    for (const mode of MODES) {
      for (let offset = 0; offset <= DAYS_TO_PREGENERATE; offset++) {
        const targetDateString = getUtcDateStringPlusDays(offset);

        const existingRows = await sql`
          select *
          from daily_puzzles
          where mode = ${mode}
            and puzzle_date = ${targetDateString}::date
          limit 1
        `;

        if (existingRows.length > 0) {
          reusedCards.push(existingRows[0]);
          continue;
        }

        const oracleId = await pickOracleId(targetDateString, mode);

        if (!oracleId) {
          return Response.json(
            {
              ok: false,
              error: `No eligible card found for ${mode} on ${targetDateString}.`,
            },
            { status: 500 },
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

        if (rows.length > 0) {
          createdCards.push(rows[0]);
        }
      }
    }

    return Response.json({
      ok: true,
      createdCount: createdCards.length,
      reusedCount: reusedCards.length,
      createdCards,
      reusedCards,
    });
  } catch (err) {
    console.error("Daily card selection failed", err);

    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
