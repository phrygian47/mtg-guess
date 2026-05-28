import { sql } from "@/lib/db/db";

const RECENT_DAYS_TO_AVOID = 180;
const DAYS_TO_PREGENERATE = 3;

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

async function pickOracleId(targetDateString: string) {
  const freshRows = await sql`
    select cp.oracle_id
    from card_pool cp
    where cp.enabled = true
      and not exists (
        select 1
        from card_history ch
        where ch.oracle_id = cp.oracle_id
          and ch.puzzle_date >= (${targetDateString}::date - ${RECENT_DAYS_TO_AVOID}::int)
          and ch.puzzle_date < ${targetDateString}::date
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
    left join card_history ch
      on ch.oracle_id = cp.oracle_id
    where cp.enabled = true
    group by cp.oracle_id, cp.weight
    order by max(ch.puzzle_date) nulls first, random() * cp.weight desc
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

    for (let offset = 0; offset <= DAYS_TO_PREGENERATE; offset++) {
      const targetDateString = getUtcDateStringPlusDays(offset);

      const existingRows = await sql`
        select *
        from card_history
        where puzzle_date = ${targetDateString}::date
        limit 1
      `;

      if (existingRows.length > 0) {
        reusedCards.push(existingRows[0]);
        continue;
      }

      const oracleId = await pickOracleId(targetDateString);

      if (!oracleId) {
        return Response.json(
          {
            ok: false,
            error: `No eligible card found for ${targetDateString}.`,
          },
          { status: 500 },
        );
      }

      const rows = await sql`
        insert into card_history (oracle_id, puzzle_date)
        values (
          ${oracleId}::uuid,
          ${targetDateString}::date
        )
        on conflict (puzzle_date) do nothing
        returning *
      `;

      if (rows.length > 0) {
        createdCards.push(rows[0]);
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
