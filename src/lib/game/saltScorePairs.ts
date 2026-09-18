import { sql } from "@/lib/db/db";
import {
  DEFAULT_DAYS_TO_PREGENERATE,
  getCurrentPuzzleDate,
  getUtcDateStringPlusDays,
} from "@/lib/game/dailyPuzzles";

const SALT_SCORE_PAIR_COUNT = 5;
const SALT_SCORE_CARDS_PER_PAIR = 2;
const SALT_SCORE_CARD_COUNT = SALT_SCORE_PAIR_COUNT * SALT_SCORE_CARDS_PER_PAIR;
const CANDIDATE_LIMIT = 80;

export const SALT_SCORE_MODE = "salt-score";

type SaltScoreSide = "left" | "right";

type SaltScoreCandidateRow = {
  oracle_id: string;
  name: string;
  image_normal: string | null;
  salt_score: number | string;
};

type SaltScoreSelectionRow = {
  id: number | string;
  mode: string;
  puzzle_date: string;
};

type SaltScoreSelectionCardRow = SaltScoreSelectionRow & {
  oracle_id: string;
  name: string;
  image_normal: string | null;
  position: number | string;
  salt_score: number | string;
};

export type SaltScorePairCard = {
  oracle_id: string;
  name: string;
  image_normal: string | null;
  salt_score: number;
  position: number;
  pair_number: number;
  side: SaltScoreSide;
};

export type SaltScorePair = {
  pair_number: number;
  left: SaltScorePairCard;
  right: SaltScorePairCard;
};

export type SaltScoreSelection = {
  id: number;
  mode: typeof SALT_SCORE_MODE;
  puzzle_date: string;
  pairs: SaltScorePair[];
};

function toSaltScore(value: number | string): number {
  return Number(value);
}

function getPairNumber(position: number): number {
  return Math.ceil(position / SALT_SCORE_CARDS_PER_PAIR);
}

function getPairSide(position: number): SaltScoreSide {
  return position % SALT_SCORE_CARDS_PER_PAIR === 1 ? "left" : "right";
}

function mapSelectionRows(
  rows: SaltScoreSelectionCardRow[],
): SaltScoreSelection | null {
  const firstRow = rows[0];

  if (!firstRow) {
    return null;
  }

  const cards = rows.map((row) => {
    const position = Number(row.position);

    return {
      oracle_id: row.oracle_id,
      name: row.name,
      image_normal: row.image_normal,
      salt_score: toSaltScore(row.salt_score),
      position,
      pair_number: getPairNumber(position),
      side: getPairSide(position),
    };
  });

  const pairs: SaltScorePair[] = [];

  for (let pairNumber = 1; pairNumber <= SALT_SCORE_PAIR_COUNT; pairNumber++) {
    const left = cards.find(
      (card) => card.pair_number === pairNumber && card.side === "left",
    );
    const right = cards.find(
      (card) => card.pair_number === pairNumber && card.side === "right",
    );

    if (!left || !right) {
      return null;
    }

    pairs.push({
      pair_number: pairNumber,
      left,
      right,
    });
  }

  return {
    id: Number(firstRow.id),
    mode: SALT_SCORE_MODE,
    puzzle_date: firstRow.puzzle_date,
    pairs,
  };
}

function buildSaltScorePairs(
  candidates: SaltScoreCandidateRow[],
): SaltScorePairCard[] {
  const unusedCandidates = [...candidates];
  const selectedCards: SaltScorePairCard[] = [];

  for (let pairNumber = 1; pairNumber <= SALT_SCORE_PAIR_COUNT; pairNumber++) {
    const leftCandidate = unusedCandidates.shift();

    if (!leftCandidate) {
      throw new Error("Not enough salt score cards to create pairs.");
    }

    const leftSaltScore = toSaltScore(leftCandidate.salt_score);
    const rightCandidateIndex = unusedCandidates.findIndex(
      (candidate) => toSaltScore(candidate.salt_score) !== leftSaltScore,
    );

    if (rightCandidateIndex === -1) {
      throw new Error("Could not find a non-tied salt score pair.");
    }

    const [rightCandidate] = unusedCandidates.splice(rightCandidateIndex, 1);
    const pairCandidates =
      Math.random() < 0.5
        ? [leftCandidate, rightCandidate]
        : [rightCandidate, leftCandidate];

    for (const [index, candidate] of pairCandidates.entries()) {
      const position = (pairNumber - 1) * SALT_SCORE_CARDS_PER_PAIR + index + 1;

      selectedCards.push({
        oracle_id: candidate.oracle_id,
        name: candidate.name,
        image_normal: candidate.image_normal,
        salt_score: toSaltScore(candidate.salt_score),
        position,
        pair_number: pairNumber,
        side: getPairSide(position),
      });
    }
  }

  return selectedCards;
}

async function getSaltScoreSelectionRowForDate(
  puzzleDate: string,
): Promise<SaltScoreSelectionRow | null> {
  const rows = (await sql`
    select
        id
      , mode
      , puzzle_date::text as puzzle_date
    from multicard_game_selections
    where mode = ${SALT_SCORE_MODE}
      and puzzle_date = ${puzzleDate}::date
    order by id
    limit 1
  `) as SaltScoreSelectionRow[];

  return rows[0] ?? null;
}

export async function getSaltScoreSelectionForDate(
  puzzleDate: string,
): Promise<SaltScoreSelection | null> {
  const rows = (await sql`
    select
        selections.id
      , selections.mode
      , selections.puzzle_date::text as puzzle_date
      , selection_cards.oracle_id::text as oracle_id
      , selection_cards.position
      , selection_cards.salt_score
      , cards.name
      , cards.image_normal
    from multicard_game_selections selections
    join multicard_game_selection_cards selection_cards
      on selection_cards.multicard_game_selection_id = selections.id
    join cards
      on cards.oracle_id = selection_cards.oracle_id
    where selections.mode = ${SALT_SCORE_MODE}
      and selections.puzzle_date = ${puzzleDate}::date
    order by selection_cards.position
  `) as SaltScoreSelectionCardRow[];

  return mapSelectionRows(rows);
}

async function pickSaltScoreCandidates(
  puzzleDate: string,
): Promise<SaltScoreCandidateRow[]> {
  const unusedRows = (await sql`
    select
        cards.oracle_id::text as oracle_id
      , cards.name
      , cards.image_normal
      , cards.edhrec_saltiness::text as salt_score
    from cards
    where cards.edhrec_saltiness is not null
      and cards.edhrec_saltiness >= 1.0
      and cards.image_normal is not null
      and not exists (
        select 1
        from multicard_game_selections selections
        join multicard_game_selection_cards selection_cards
          on selection_cards.multicard_game_selection_id = selections.id
        where selections.mode = ${SALT_SCORE_MODE}
          and selection_cards.oracle_id = cards.oracle_id
          and selections.puzzle_date < ${puzzleDate}::date
      )
    order by random()
    limit ${CANDIDATE_LIMIT}
  `) as SaltScoreCandidateRow[];

  if (unusedRows.length >= SALT_SCORE_CARD_COUNT) {
    return unusedRows;
  }

  // Every salty card has been used at least once. Reset by allowing
  // previously used cards back into rotation, rather than lowering the
  // salt bar, so we still only ever pick cards that are actually salty.
  return (await sql`
    select
        cards.oracle_id::text as oracle_id
      , cards.name
      , cards.image_normal
      , cards.edhrec_saltiness::text as salt_score
    from cards
    where cards.edhrec_saltiness is not null
      and cards.edhrec_saltiness >= 1.0
      and cards.image_normal is not null
    order by random()
    limit ${CANDIDATE_LIMIT}
  `) as SaltScoreCandidateRow[];
}

async function createSaltScoreSelection(
  puzzleDate: string,
): Promise<SaltScoreSelection | null> {
  const candidates = await pickSaltScoreCandidates(puzzleDate);
  const selectedCards = buildSaltScorePairs(candidates);

  const selectionRows = (await sql`
    insert into multicard_game_selections (mode, puzzle_date)
    values (${SALT_SCORE_MODE}, ${puzzleDate}::date)
    returning
        id
      , mode
      , puzzle_date::text as puzzle_date
  `) as SaltScoreSelectionRow[];

  const selectionRow = selectionRows[0];

  if (!selectionRow) {
    return null;
  }

  const selectionId = Number(selectionRow.id);
  const cardsToInsert = selectedCards.map((card) => ({
    oracle_id: card.oracle_id,
    position: card.position,
    salt_score: card.salt_score,
  }));

  await sql`
    insert into multicard_game_selection_cards (
        multicard_game_selection_id
      , oracle_id
      , position
      , salt_score
    )
    select
        ${selectionId}::bigint
      , incoming.oracle_id
      , incoming.position
      , incoming.salt_score
    from jsonb_to_recordset(${JSON.stringify(cardsToInsert)}::jsonb) as incoming(
        oracle_id uuid
      , position integer
      , salt_score numeric
    )
    order by incoming.position
  `;

  return getSaltScoreSelectionForDate(puzzleDate);
}

export async function ensureSaltScoreSelectionForDate(
  puzzleDate: string,
): Promise<{ selection: SaltScoreSelection; created: boolean } | null> {
  const existingSelection = await getSaltScoreSelectionForDate(puzzleDate);

  if (existingSelection) {
    return {
      selection: existingSelection,
      created: false,
    };
  }

  const incompleteSelectionRow =
    await getSaltScoreSelectionRowForDate(puzzleDate);

  if (incompleteSelectionRow) {
    throw new Error(
      `Salt score selection ${incompleteSelectionRow.id} for ${puzzleDate} is incomplete.`,
    );
  }

  const createdSelection = await createSaltScoreSelection(puzzleDate);

  return createdSelection
    ? {
        selection: createdSelection,
        created: true,
      }
    : null;
}

export async function ensureSaltScoreSelectionForTimezone(timezone: string) {
  const puzzleDate = await getCurrentPuzzleDate(timezone);

  return ensureSaltScoreSelectionForDate(puzzleDate);
}

export async function fillSaltScoreSelections({
  daysToPregenerate = DEFAULT_DAYS_TO_PREGENERATE,
}: {
  daysToPregenerate?: number;
} = {}) {
  const createdSelections: SaltScoreSelection[] = [];
  const reusedSelections: SaltScoreSelection[] = [];
  const missingSelections: {
    mode: typeof SALT_SCORE_MODE;
    puzzle_date: string;
  }[] = [];

  for (let offset = 0; offset <= daysToPregenerate; offset++) {
    const puzzleDate = getUtcDateStringPlusDays(offset);
    const result = await ensureSaltScoreSelectionForDate(puzzleDate);

    if (!result) {
      missingSelections.push({
        mode: SALT_SCORE_MODE,
        puzzle_date: puzzleDate,
      });
      continue;
    }

    if (result.created) {
      createdSelections.push(result.selection);
    } else {
      reusedSelections.push(result.selection);
    }
  }

  return {
    createdSelections,
    reusedSelections,
    missingSelections,
  };
}
