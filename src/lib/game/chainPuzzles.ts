import { sql } from "@/lib/db/db";
import { CHAIN_ROW_COUNT } from "@/lib/game/chainTokens";

// Server-only: this module imports db.ts. Anything that needs chain helpers
// without a database connection should import from chainTokens.ts instead.

export type ChainStep = {
  position: number;
  token: string;
  link_oracle_id: string | null;
  link_card_name: string | null;
  link_card_image: string | null;
};

export type ChainPuzzle = {
  id: number;
  slug: string;
  puzzle_date: string;
  steps: ChainStep[];
};

type ChainStepRow = {
  id: number | string;
  slug: string;
  puzzle_date: string;
  position: number | string;
  token: string;
  link_oracle_id: string | null;
  link_card_name: string | null;
  link_card_image: string | null;
};

function mapChainRows(rows: ChainStepRow[]): ChainPuzzle | null {
  const firstRow = rows[0];

  if (!firstRow || rows.length !== CHAIN_ROW_COUNT) {
    return null;
  }

  const steps = rows.map((row) => ({
    position: Number(row.position),
    token: row.token,
    link_oracle_id: row.link_oracle_id,
    link_card_name: row.link_card_name,
    link_card_image: row.link_card_image,
  }));

  // Positions must be a complete 0..n-1 run or the reveal maths is wrong.
  const positionsAreContiguous = steps.every(
    (step, index) => step.position === index,
  );

  if (!positionsAreContiguous) {
    return null;
  }

  return {
    id: Number(firstRow.id),
    slug: firstRow.slug,
    puzzle_date: firstRow.puzzle_date,
    steps,
  };
}

export async function getChainPuzzleForDate(
  puzzleDate: string,
): Promise<ChainPuzzle | null> {
  const rows = (await sql`
    select
        puzzles.id
      , puzzles.slug
      , schedule.puzzle_date::text as puzzle_date
      , steps.position
      , steps.token
      , steps.link_oracle_id::text as link_oracle_id
      , cards.name as link_card_name
      , cards.image_normal as link_card_image
    from chain_puzzle_schedule schedule
    join chain_puzzles puzzles
      on puzzles.id = schedule.chain_puzzle_id
    join chain_puzzle_steps steps
      on steps.chain_puzzle_id = puzzles.id
    left join cards
      on cards.oracle_id = steps.link_oracle_id
    where schedule.puzzle_date = ${puzzleDate}::date
    order by steps.position
  `) as ChainStepRow[];

  return mapChainRows(rows);
}
