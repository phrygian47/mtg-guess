import { sql } from "@/lib/db/db";
import type { CellTone, InfoGridRow, InfoOtherLine } from "@/lib/game/types";

type DailyCardSelectionRow = {
  image_small: string | null;
  colors: string[] | null;
  cmc: number | null;
  type_line: string | null;
  set_codes: string[] | null;
  rarity: string | null;
  keywords: string[] | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  produced_mana: string[] | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const timezone = searchParams.get("timezone")?.trim() || "UTC";
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return Response.json(
      { error: "Missing required query param: cardId" },
      { status: 400 },
    );
  }

  const [answerRows, guessRows] = await Promise.all([
    sql`
      select 
          d.image_small
        , d.colors
        , d.cmc
        , d.type_line
        , array_agg(distinct c.set_code order by c.set_code) as set_codes
        , d.rarity
        , d.keywords
        , d.power
        , d.toughness
        , d.loyalty
        , d.produced_mana
      from dailycardselections d
      join cards c
        on c.oracle_id = d.oracle_id
      where d.puzzle_date = (now() at time zone ${timezone})::date
      group by
          d.image_small
        , d.colors
        , d.cmc
        , d.type_line
        , d.rarity
        , d.keywords
        , d.power
        , d.toughness
        , d.loyalty
        , d.produced_mana
      limit 1
    `,

    sql`
      with guess_card as (
        select *
        from cards
        where oracle_id = ${cardId}
        order by released_at desc nulls last
        limit 1
      ),
      guess_sets as (
        select array_agg(distinct set_code order by set_code) as set_codes
        from cards
        where oracle_id = ${cardId}
      )
      select 
          guess_card.image_small
        , guess_card.colors
        , guess_card.cmc
        , guess_card.type_line
        , guess_sets.set_codes
        , guess_card.rarity
        , guess_card.keywords
        , guess_card.power
        , guess_card.toughness
        , guess_card.loyalty
        , guess_card.produced_mana
      from guess_card
      cross join guess_sets
    `,
  ]);

  const answer = (answerRows as DailyCardSelectionRow[])[0];
  const guess = (guessRows as DailyCardSelectionRow[])[0];

  if (!answer) {
    return Response.json(
      { error: "No daily card selection found." },
      { status: 404 },
    );
  }

  if (!guess) {
    return Response.json({ error: "No guessed card found." }, { status: 404 });
  }

  return Response.json(mapGuessToInfoGridRow(answer, guess));
}

function mapGuessToInfoGridRow(
  answer: DailyCardSelectionRow,
  guess: DailyCardSelectionRow,
): InfoGridRow {
  return {
    card: {
      value: guess.image_small,
      tone: "neutral",
    },

    colors: {
      value: formatColors(guess.colors),
      tone: compareArray(answer.colors, guess.colors),
    },

    mana_value: {
      value: guess.cmc ?? "—",
      tone: compareValue(answer.cmc, guess.cmc),
    },

    type: {
      value: getCardType(guess.type_line),
      tone: compareValue(
        getCardType(answer.type_line),
        getCardType(guess.type_line),
      ),
    },

    subtypes: {
      value: getCardSubtypes(guess.type_line),
      tone: compareArray(
        getSubtypeArray(answer.type_line),
        getSubtypeArray(guess.type_line),
      ),
    },

    set: {
      value: formatSets(guess.set_codes),
      tone: compareArray(answer.set_codes, guess.set_codes),
    },

    rarity: {
      value: guess.rarity ?? "—",
      tone: compareValue(
        normalizeNullable(answer.rarity),
        normalizeNullable(guess.rarity),
      ),
    },

    other: {
      value: formatOtherLines(answer, guess),
      tone: "neutral",
    },
  };
}

function formatOtherLines(
  answer: DailyCardSelectionRow,
  guess: DailyCardSelectionRow,
): InfoOtherLine[] {
  return [
    {
      label: "P/T",
      value: formatStats(guess.power, guess.toughness),
      tone: compareStats(
        answer.power,
        answer.toughness,
        guess.power,
        guess.toughness,
      ),
    },
    {
      label: "Loyalty",
      value: guess.loyalty ?? "—",
      tone: compareOptionalValue(answer.loyalty, guess.loyalty),
    },
    {
      label: "Produces",
      value: formatArrayValue(guess.produced_mana),
      tone: compareOptionalArray(answer.produced_mana, guess.produced_mana),
    },
    {
      label: "Keywords",
      value: formatArrayValue(guess.keywords),
      tone: compareOptionalArray(answer.keywords, guess.keywords),
    },
  ];
}

function compareValue(
  answer: string | number | null,
  guess: string | number | null,
): CellTone {
  if (answer == null || guess == null) {
    return "neutral";
  }

  return answer === guess ? "correct" : "wrong";
}

function compareOptionalValue(
  answer: string | number | null,
  guess: string | number | null,
): CellTone {
  if (answer == null && guess == null) {
    return "correct";
  }

  if (answer == null || guess == null) {
    return "wrong";
  }

  return answer === guess ? "correct" : "wrong";
}

function compareStats(
  answerPower: string | null,
  answerToughness: string | null,
  guessPower: string | null,
  guessToughness: string | null,
): CellTone {
  const answerHasStats = answerPower != null && answerToughness != null;
  const guessHasStats = guessPower != null && guessToughness != null;

  if (!answerHasStats && !guessHasStats) {
    return "correct";
  }

  if (!answerHasStats || !guessHasStats) {
    return "wrong";
  }

  return answerPower === guessPower && answerToughness === guessToughness
    ? "correct"
    : "wrong";
}

function compareOptionalArray(
  answer: string[] | null,
  guess: string[] | null,
): CellTone {
  const answerValues = normalizeArray(answer);
  const guessValues = normalizeArray(guess);

  if (answerValues.length === 0 && guessValues.length === 0) {
    return "correct";
  }

  return compareArray(answer, guess);
}

function compareArray(
  answer: string[] | null,
  guess: string[] | null,
): CellTone {
  const answerValues = normalizeArray(answer);
  const guessValues = normalizeArray(guess);

  if (answerValues.length === 0 && guessValues.length === 0) {
    return "correct";
  }

  if (answerValues.length === 0 || guessValues.length === 0) {
    return "wrong";
  }

  const answerSet = new Set(answerValues);
  const guessSet = new Set(guessValues);

  const exactMatch =
    answerSet.size === guessSet.size &&
    [...answerSet].every((value) => guessSet.has(value));

  if (exactMatch) {
    return "correct";
  }

  const hasOverlap = [...guessSet].some((value) => answerSet.has(value));

  return hasOverlap ? "partial" : "wrong";
}

function normalizeArray(values: string[] | null): string[] {
  return values?.map(normalize).filter(Boolean) ?? [];
}

function formatSets(setCodes: string[] | null): string {
  if (!setCodes || setCodes.length === 0) {
    return "—";
  }

  return setCodes.map((setCode) => setCode.toUpperCase()).join(", ");
}

function formatArrayValue(values: string[] | null): string {
  if (!values || values.length === 0) {
    return "—";
  }

  return values.join(", ");
}

function getCardType(typeLine: string | null): string {
  if (!typeLine) {
    return "—";
  }

  return typeLine.split("—")[0]?.trim() || "—";
}

function getCardSubtypes(typeLine: string | null): string {
  const subtypes = getSubtypeArray(typeLine);

  if (subtypes.length === 0) {
    return "—";
  }

  return subtypes.join(", ");
}

function getSubtypeArray(typeLine: string | null): string[] {
  if (!typeLine || !typeLine.includes("—")) {
    return [];
  }

  const subtypeText = typeLine.split("—")[1]?.trim();

  if (!subtypeText) {
    return [];
  }

  return subtypeText.split(/\s+/);
}

function formatColors(colors: string[] | null): string {
  if (!colors || colors.length === 0) {
    return "Colorless";
  }

  return colors.join(", ");
}

function formatStats(power: string | null, toughness: string | null): string {
  if (power == null || toughness == null) {
    return "—";
  }

  return `${power}/${toughness}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullable(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  return normalize(value);
}
