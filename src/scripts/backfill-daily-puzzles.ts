import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const { sql } = await import("@/lib/db/db");

  const rows = await sql`
    insert into daily_puzzles (mode, puzzle_date, oracle_id)
    select 'classic', puzzle_date, oracle_id
    from card_history
    on conflict (mode, puzzle_date) do update
    set oracle_id = excluded.oracle_id
    returning puzzle_date
  `;

  const summary = await sql`
    select
        mode
      , count(*)::int as puzzle_count
      , min(puzzle_date)::text as first_puzzle_date
      , max(puzzle_date)::text as last_puzzle_date
    from daily_puzzles
    group by mode
    order by mode
  `;

  console.log(
    `Backfilled ${rows.length} classic puzzle rows into daily_puzzles.`,
  );
  console.table(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
