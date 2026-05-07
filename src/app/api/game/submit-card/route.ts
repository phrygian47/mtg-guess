import { sql } from "@/lib/db/db";
import { InfoGridRow } from "@/lib/game/types";

type CellTone = "correct" | "partial" | "wrong" | "neutral";

type DailyCardSelectionRow = {
  image_small: string | null;
  colors: string[] | null;
  cmc: number | null;
  type_line: string | null;
  set_code: string | null;
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
        image_small
       ,colors
       ,cmc
       ,type_line
       ,set_code
       ,rarity
       ,keywords
       ,power
       ,toughness
       ,produced_mana
    from dailycardselections
    where puzzle_date = (now() at time zone ${timezone})::date
    limit 1
  `) as DailyCardSelectionRow[];

  const guessRows = (await sql`
    select 
        image_small
       ,colors
       ,cmc
       ,type_line
       ,set_code
       ,rarity
       ,keywords
       ,power
       ,toughness
       ,produced_mana
    from cards
    where id = ${cardId}
    limit 1
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
      value: guess.set_code?.toUpperCase() ?? "—",
      tone: compareValue(
        normalizeNullable(answer.set_code),
        normalizeNullable(guess.set_code),
      ),
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
