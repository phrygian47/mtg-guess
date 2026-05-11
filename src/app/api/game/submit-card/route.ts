import { sql } from "@/lib/db/db";
import type { InfoGridRow } from "@/lib/game/types";

type CellTone = "correct" | "partial" | "wrong" | "neutral";

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
  produced_mana: string[] | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const timezone = searchParams.get("timezone") ?? "UTC";
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return Response.json(
      { error: "Missing required query param: cardId" },
      { status: 400 },
    );
  }

  const answerRows = (await sql`
    select 
        d.image_small
      ,d.colors
      ,d.cmc
      ,d.type_line
      ,array_agg(distinct c.set_code order by c.set_code) as set_codes
      ,d.rarity
      ,d.keywords
      ,d.power
      ,d.toughness
      ,d.produced_mana
    from dailycardselections d
    join cards c
      on c.oracle_id = d.oracle_id
    where d.puzzle_date = (now() at time zone ${timezone})::date
    group by
        d.image_small
      ,d.colors
      ,d.cmc
      ,d.type_line
      ,d.rarity
      ,d.keywords
      ,d.power
      ,d.toughness
      ,d.produced_mana
    limit 1
  `) as DailyCardSelectionRow[];

  const guessRows = (await sql`
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
      ,guess_card.colors
      ,guess_card.cmc
      ,guess_card.type_line
      ,guess_sets.set_codes
      ,guess_card.rarity
      ,guess_card.keywords
      ,guess_card.power
      ,guess_card.toughness
      ,guess_card.produced_mana
    from guess_card
    cross join guess_sets
  `) as DailyCardSelectionRow[];

  const answer = answerRows[0];
  const guess = guessRows[0];

  if (!answer) {
    return Response.json(
      { error: "No daily card selection found." },
      { status: 404 },
    );
  }

  if (!guess) {
    return Response.json({ error: "No guessed card found." }, { status: 404 });
  }

  const infoRow = mapGuessToInfoGridRow(answer, guess);
  console.log(infoRow);
  return Response.json(infoRow);
}

function mapGuessToInfoGridRow(
  answer: DailyCardSelectionRow,
  guess: DailyCardSelectionRow,
): InfoGridRow {
  return {
    card: {
      value: guess.image_small,
      tone: compareValue(answer.image_small, guess.image_small),
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

    stats: {
      value: formatStats(guess.power, guess.toughness),
      tone: compareValue(
        formatStats(answer.power, answer.toughness),
        formatStats(guess.power, guess.toughness),
      ),
    },

    keywords: {
      value: formatKeywords(guess.keywords),
      tone: compareArray(answer.keywords, guess.keywords),
    },
  };
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

function formatSets(setCodes: string[] | null): string {
  if (!setCodes || setCodes.length === 0) {
    return "—";
  }

  return setCodes.map((setCode) => setCode.toUpperCase()).join(", ");
}

function compareArray(
  answer: string[] | null,
  guess: string[] | null,
): CellTone {
  const answerValues = answer?.map(normalize).filter(Boolean) ?? [];
  const guessValues = guess?.map(normalize).filter(Boolean) ?? [];

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

function formatKeywords(keywords: string[] | null): string {
  if (!keywords || keywords.length === 0) {
    return "—";
  }

  return keywords.join(", ");
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
