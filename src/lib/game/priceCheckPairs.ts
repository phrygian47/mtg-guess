import { sql } from "@/lib/db/db";
import { getCurrentPuzzleDate } from "@/lib/game/dailyPuzzles";

export const PRICE_CHECK_MAX_PAIRS = 5;

// Two prices closer than this are a coin flip rather than a fair question.
const MIN_PRICE_RATIO = 1.5;
const CANDIDATE_LIMIT = 300;

type Side = "left" | "right";

type CandidateRow = {
  matchup_id: number | string;
  item_id: number | string;
  item_name: string;
  item_image: string;
  item_price_cents: number | string;
  card_name: string;
  card_image: string;
  card_price_cents: number | string;
};

type PairRow = {
  position: number | string;
  left_name: string;
  left_image: string;
  left_price_cents: number | string;
  right_name: string;
  right_image: string;
  right_price_cents: number | string;
};

type NewPair = {
  position: number;
  matchup_id: number;
  left_name: string;
  left_image: string;
  left_price_cents: number;
  right_name: string;
  right_image: string;
  right_price_cents: number;
};

export type PriceCheckSide = {
  name: string;
  image: string;
  price_cents: number;
};

export type PriceCheckPair = {
  pair_number: number;
  left: PriceCheckSide;
  right: PriceCheckSide;
};

export type PriceCheckSelection = {
  puzzle_date: string;
  pairs: PriceCheckPair[];
};

export async function ensurePriceCheckTables() {
  await sql`
    create table if not exists price_check_selections (
        id bigserial primary key
      , puzzle_date date not null unique
      , created_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists price_check_pairs (
        id bigserial primary key
      , selection_id bigint not null references price_check_selections(id) on delete cascade
      , position integer not null
      , matchup_id bigint
      , left_name text not null
      , left_image text not null
      , left_price_cents integer not null
      , right_name text not null
      , right_image text not null
      , right_price_cents integer not null
      , unique (selection_id, position)
    )
  `;
}

function pickRandomSide(): Side {
  return Math.random() < 0.5 ? "left" : "right";
}

function buildPairs(candidates: CandidateRow[]): NewPair[] {
  // Candidates arrive least-recently-used first, so each pass keeps that
  // preference. The first pass takes at most one matchup per real-world item
  // so a single day isn't five houses; the second pass tops up if needed.
  const chosen: CandidateRow[] = [];
  const usedItemIds = new Set<number>();

  for (const candidate of candidates) {
    if (chosen.length >= PRICE_CHECK_MAX_PAIRS) break;

    const itemId = Number(candidate.item_id);

    if (usedItemIds.has(itemId)) continue;

    usedItemIds.add(itemId);
    chosen.push(candidate);
  }

  for (const candidate of candidates) {
    if (chosen.length >= PRICE_CHECK_MAX_PAIRS) break;

    if (!chosen.includes(candidate)) chosen.push(candidate);
  }

  return chosen.map((candidate, index) => {
    const item = {
      name: candidate.item_name,
      image: candidate.item_image,
      price_cents: Number(candidate.item_price_cents),
    };
    const card = {
      name: candidate.card_name,
      image: candidate.card_image,
      price_cents: Number(candidate.card_price_cents),
    };
    const itemSide = pickRandomSide();
    const left = itemSide === "left" ? item : card;
    const right = itemSide === "left" ? card : item;

    return {
      position: index + 1,
      matchup_id: Number(candidate.matchup_id),
      left_name: left.name,
      left_image: left.image,
      left_price_cents: left.price_cents,
      right_name: right.name,
      right_image: right.image,
      right_price_cents: right.price_cents,
    };
  });
}

async function pickCandidates(): Promise<CandidateRow[]> {
  // Never-used matchups come first, then the least recently used, with a
  // random order inside each group. Unpriced printings and near-ties are
  // filtered out here, using the effective price (custom override, else market).
  return (await sql`
    with last_used as (
      select p.matchup_id, max(s.puzzle_date) as last_date
      from price_check_pairs p
      join price_check_selections s on s.id = p.selection_id
      where p.matchup_id is not null
      group by p.matchup_id
    ),
    priced as (
      select
          m.id as matchup_id
        , i.id as item_id
        , i.name as item_name
        , i.image_url as item_image
        , i.price_cents as item_price_cents
        , coalesce(m.card_name_override, c.name) as card_name
        , c.image_normal as card_image
        , round(coalesce(m.card_price_override_usd, c.price_usd, c.price_usd_foil) * 100)::int as card_price_cents
        , lu.last_date
      from price_matchups m
      join everyday_items i on i.id = m.item_id and i.enabled
      join card_printings c on c.uuid = m.printing_uuid
      left join last_used lu on lu.matchup_id = m.id
      where m.enabled
    )
    select matchup_id, item_id, item_name, item_image, item_price_cents
         , card_name, card_image, card_price_cents
    from priced
    where card_price_cents is not null
      and greatest(item_price_cents, card_price_cents)::numeric
          >= least(item_price_cents, card_price_cents) * ${MIN_PRICE_RATIO}::numeric
    order by last_date asc nulls first, random()
    limit ${CANDIDATE_LIMIT}
  `) as CandidateRow[];
}

export async function getPriceCheckSelectionForDate(
  puzzleDate: string,
): Promise<PriceCheckSelection | null> {
  const rows = (await sql`
    select
        p.position
      , p.left_name, p.left_image, p.left_price_cents
      , p.right_name, p.right_image, p.right_price_cents
    from price_check_selections s
    join price_check_pairs p on p.selection_id = s.id
    where s.puzzle_date = ${puzzleDate}::date
    order by p.position
  `) as PairRow[];

  if (rows.length === 0) return null;

  return {
    puzzle_date: puzzleDate,
    pairs: rows.map((row) => ({
      pair_number: Number(row.position),
      left: {
        name: row.left_name,
        image: row.left_image,
        price_cents: Number(row.left_price_cents),
      },
      right: {
        name: row.right_name,
        image: row.right_image,
        price_cents: Number(row.right_price_cents),
      },
    })),
  };
}

export async function ensurePriceCheckSelectionForDate(
  puzzleDate: string,
): Promise<PriceCheckSelection | null> {
  const existing = await getPriceCheckSelectionForDate(puzzleDate);

  if (existing) return existing;

  const pairs = buildPairs(await pickCandidates());

  if (pairs.length === 0) return null;

  // One statement creates the selection and all its pairs together, so a
  // concurrent request never sees a selection that has no pairs yet.
  await sql`
    with selection as (
      insert into price_check_selections (puzzle_date)
      values (${puzzleDate}::date)
      on conflict (puzzle_date) do nothing
      returning id
    )
    insert into price_check_pairs (
        selection_id, position, matchup_id
      , left_name, left_image, left_price_cents
      , right_name, right_image, right_price_cents
    )
    select
        selection.id, x.position, x.matchup_id
      , x.left_name, x.left_image, x.left_price_cents
      , x.right_name, x.right_image, x.right_price_cents
    from selection
    cross join jsonb_to_recordset(${JSON.stringify(pairs)}::jsonb) as x(
        position integer
      , matchup_id bigint
      , left_name text
      , left_image text
      , left_price_cents integer
      , right_name text
      , right_image text
      , right_price_cents integer
    )
  `;

  return getPriceCheckSelectionForDate(puzzleDate);
}

export async function ensurePriceCheckSelectionForTimezone(timezone: string) {
  const puzzleDate = await getCurrentPuzzleDate(timezone);

  return ensurePriceCheckSelectionForDate(puzzleDate);
}
