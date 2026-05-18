import { sql } from "@/lib/db/db";

const PUZZLE_TIMEZONE = "America/Los_Angeles";
const RECENT_DAYS_TO_AVOID = 180;

async function pickOracleId() {
  const freshRows = await sql`
    select cp.oracle_id
    from card_pool cp
    where cp.enabled = true
      and not exists (
        select 1
        from card_history ch
        where ch.oracle_id = cp.oracle_id
          and ch.puzzle_date >= ((now() at time zone ${PUZZLE_TIMEZONE})::date - ${RECENT_DAYS_TO_AVOID})
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
    const todayRows = await sql`
      select *
      from card_history
      where puzzle_date = (now() at time zone ${PUZZLE_TIMEZONE})::date
      limit 1
    `;

    if (todayRows.length > 0) {
      return Response.json({
        ok: true,
        reusedExisting: true,
        card: todayRows[0],
      });
    }

    const oracleId = await pickOracleId();

    if (!oracleId) {
      return Response.json(
        { ok: false, error: "No eligible card found in card_pool." },
        { status: 500 },
      );
    }

    const rows = await sql`
      insert into card_history (oracle_id, puzzle_date)
      values (
        ${oracleId}::uuid,
        (now() at time zone ${PUZZLE_TIMEZONE})::date
      )
      on conflict (puzzle_date) do update
      set oracle_id = excluded.oracle_id
      returning *
    `;

    return Response.json({
      ok: true,
      card: rows[0],
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
