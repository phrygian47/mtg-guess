import { sql } from "@/lib/db/db";

import type { CellTone, InfoGridRow, SetInfo } from "@/lib/game/types";

type DailyCardSelectionRow = {
  image_small: string | null;
  colors: string[] | null;
  cmc: number | null;
  type_line: string | null;
  sets: SetInfo[] | null;
  rarity: string | null;
  tags: string[] | null;
  release_year: number | null;
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
        , coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                'code', x.set_code,
                'name', x.name,
                'image_uri', x.image_uri
              )
                order by x.set_code
              )
              from (
                select distinct
                    c2.set_code
                  , s2.name
                  , s2.imageuri as image_uri
                from cards c2
                left join sets s2
                  on s2.code = c2.set_code
                where c2.oracle_id = d.oracle_id::uuid
                  and c2.set_code is not null
              ) x
            ),
            '[]'::jsonb
          ) as sets
        , extract(year from c.released_at)::int as release_year
        , d.rarity
        , array_remove(array_agg(distinct t.slug order by t.slug), null) as tags
      from dailycardselections d
      join cards c
        on c.oracle_id = d.oracle_id::uuid
      left join card_tags ct
        on ct.oracle_id = d.oracle_id::uuid
      left join tags t
        on t.slug = ct.tag_slug
      and t.enabled = true
      where d.puzzle_date = (now() at time zone ${timezone})::date
      group by
          d.oracle_id
        , d.image_small
        , d.colors
        , d.cmc
        , d.type_line
        , c.released_at
        , d.rarity
      limit 1
    `,

    sql`
    select
          c.image_small
        , c.colors
        , c.cmc
        , c.type_line
        , case
          when c.set_code is null then '[]'::jsonb
          else jsonb_build_array(
            jsonb_build_object(
              'code', c.set_code,
              'name', s.name,
              'image_uri', s.imageuri
            )
          )
        end as sets
        , extract(year from c.released_at)::int as release_year
        , c.rarity
        , (
            select array_agg(distinct t.slug order by t.slug)
            from card_tags ct
            join tags t
              on t.slug = ct.tag_slug
            and t.enabled = true
            where ct.oracle_id = c.oracle_id
          ) as tags
      from cards c
      left join sets s
        on s.code = c.set_code
      where c.oracle_id = ${cardId}::uuid
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

    type_line: {
      value: formatTypeLine(guess.type_line),
      tone: compareTypeLine(answer.type_line, guess.type_line),
    },
    set: {
      value: formatSets(guess.sets),
      tone: compareSets(answer.sets, guess.sets),
    },

    rarity: {
      value: guess.rarity ?? "—",
      tone: compareValue(
        normalizeNullable(answer.rarity),
        normalizeNullable(guess.rarity),
      ),
    },

    tags: {
      value: formatTags(guess.tags),
      tone: compareOptionalArray(answer.tags, guess.tags),
    },

    release_year: {
      value: formatYearWithArrow(answer.release_year, guess.release_year),
      tone: compareYear(answer.release_year, guess.release_year),
    },
  };
}

function compareYear(answer: number | null, guess: number | null): CellTone {
  if (answer == null || guess == null) {
    return "neutral";
  }

  if (answer === guess) {
    return "correct";
  }

  return Math.abs(answer - guess) <= 1 ? "partial" : "wrong";
}

function formatTypeLine(typeLine: string | null): string {
  return typeLine?.trim() || "—";
}

function compareTypeLine(
  answerTypeLine: string | null,
  guessTypeLine: string | null,
): CellTone {
  const answer = getTypeLineParts(answerTypeLine);
  const guess = getTypeLineParts(guessTypeLine);

  const exactMain =
    answer.main.length === guess.main.length &&
    answer.main.every((value, index) => value === guess.main[index]);

  const exactSub =
    answer.sub.length === guess.sub.length &&
    answer.sub.every((value, index) => value === guess.sub[index]);

  if (exactMain && exactSub) {
    return "correct";
  }

  const mainOverlap = guess.main.some((value) => answer.main.includes(value));
  const subOverlap = guess.sub.some((value) => answer.sub.includes(value));

  return mainOverlap || subOverlap ? "partial" : "wrong";
}

function getTypeLineParts(typeLine: string | null): {
  main: string[];
  sub: string[];
} {
  if (!typeLine) {
    return { main: [], sub: [] };
  }

  const [mainPart, subPart] = typeLine
    .split("—")
    .map((part) => part?.trim() ?? "");

  return {
    main: mainPart ? mainPart.split(/\s+/).map(normalize) : [],
    sub: subPart ? subPart.split(/\s+/).map(normalize) : [],
  };
}

function formatYearWithArrow(
  answer: number | null,
  guess: number | null,
): string {
  if (guess == null) {
    return "—";
  }

  if (answer == null || answer === guess) {
    return String(guess);
  }

  return answer > guess ? `${guess} ↑` : `${guess} ↓`;
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

function formatTags(tags: string[] | null): string {
  const values = normalizeArray(tags);

  if (values.length === 0) {
    return "—";
  }

  return values
    .map((tag) =>
      tag
        .split("-")
        .map((part) => {
          if (part === "etb") return "ETB";
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join(" "),
    )
    .join(", ");
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

function formatSets(sets: SetInfo[] | null): SetInfo[] | string {
  if (!sets || sets.length === 0) {
    return "—";
  }

  return sets.map((set) => ({
    code: set.code.toUpperCase(),
    name: set.name,
    image_uri: set.image_uri,
  }));
}

function compareSets(
  answer: SetInfo[] | null,
  guess: SetInfo[] | null,
): CellTone {
  return compareArray(
    answer?.map((set) => set.code) ?? null,
    guess?.map((set) => set.code) ?? null,
  );
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

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeNullable(value: string | null): string | null {
  if (value == null) {
    return null;
  }

  return normalize(value);
}
