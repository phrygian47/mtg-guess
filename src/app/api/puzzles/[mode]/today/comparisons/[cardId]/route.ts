import { sql } from "@/lib/db/db";

import type {
  CellTone,
  InfoGridRow,
  SetInfo,
  ReleaseYearDirection,
  SupplementalInfoBadge,
} from "@/lib/game/types";

type DailyCardSelectionRow = {
  image_small: string | null;
  colors: string[] | null;
  cmc: number | null;
  type_line: string | null;
  layout: string | null;
  keywords: string[] | null;
  produced_mana: string[] | null;
  set: SetInfo | null;
  rarity: string | null;
  tags: string[] | null;
  release_year: number | null;
};

const MODE = "classic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ mode: string; cardId: string }>;
};

/**
 * A comparison between one candidate card and today's answer. Safe and
 * idempotent, so it is a GET, but it is a derived resource rather than a plain
 * card lookup.
 */
export async function GET(req: Request, context: RouteContext) {
  const { mode, cardId } = await context.params;

  if (mode !== MODE) {
    return Response.json(
      { error: "This mode has no comparisons resource." },
      { status: 404 },
    );
  }

  // The id interpolates into a ::uuid cast, so reject junk with a 400 rather
  // than letting Postgres raise.
  if (!UUID_PATTERN.test(cardId)) {
    return Response.json({ error: "Invalid card id." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const timezone = searchParams.get("timezone")?.trim() || "UTC";

  const [answerRows, guessRows] = await Promise.all([
    sql`
  select
    c.image_small
  , c.colors
  , c.cmc
  , c.type_line
  , c.layout
  , c.keywords
  , c.produced_mana
  , case
      when c.set_code is null then null
      else jsonb_build_object(
        'code', c.set_code,
        'name', s.name,
        'image_uri', s.imageuri,
        'release_year', extract(year from c.released_at)::int
      )
    end as set
  , extract(year from c.released_at)::int as release_year
  , c.rarity
  , array_remove(array_agg(distinct t.slug order by t.slug), null) as tags
from daily_puzzles dp
join cards c
  on c.oracle_id = dp.oracle_id
left join sets s
  on s.code = c.set_code
left join card_tags ct
  on ct.oracle_id = dp.oracle_id
left join tags t
  on t.slug = ct.tag_slug
 and t.enabled = true
where dp.mode = ${MODE}
  and dp.puzzle_date = (now() at time zone ${timezone})::date
group by
    c.oracle_id
  , c.image_small
  , c.colors
  , c.cmc
  , c.type_line
  , c.set_code
  , s.name
  , s.imageuri
  , c.released_at
  , c.rarity
  , c.layout
  , c.keywords
  , c.produced_mana
limit 1
`,

    sql`
    select
        c.image_small
      , c.colors
      , c.cmc
      , c.type_line
      , c.layout
      , c.keywords
      , c.produced_mana
      , case
          when c.set_code is null then null
          else jsonb_build_object(
            'code', c.set_code,
            'name', s.name,
            'image_uri', s.imageuri,
            'release_year', extract(year from c.released_at)::int
          )
        end as set
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
    where c.oracle_id = ${cardId}::uuid`,
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
      tone: compareManaValue(answer.cmc, guess.cmc),
      direction: getNumberDirection(answer.cmc, guess.cmc),
    },

    type_line: {
      value: formatTypeLine(guess.type_line),
      tone: compareTypeLine(answer.type_line, guess.type_line),
    },

    set: {
      value: formatSetWithYear(guess.set, answer.release_year),
      tone: compareSetWithYear(answer.set, guess.set),
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

    supplemental_info: {
      value: formatSupplementalInfo(answer, guess),
      tone: compareSupplementalInfo(answer, guess),
    },
  };
}

function getNumberDirection(
  answerValue: string | number | null,
  guessValue: string | number | null,
): ReleaseYearDirection {
  if (answerValue == null || guessValue == null) {
    return null;
  }

  const answerNumber = Number(answerValue);
  const guessNumber = Number(guessValue);

  if (Number.isNaN(answerNumber) || Number.isNaN(guessNumber)) {
    return null;
  }

  if (answerNumber === guessNumber) {
    return "same";
  }

  return answerNumber > guessNumber ? "higher" : "lower";
}

function formatSupplementalInfo(
  answer: DailyCardSelectionRow,
  guess: DailyCardSelectionRow,
): SupplementalInfoBadge[] {
  const badges: SupplementalInfoBadge[] = [
    {
      label: "Layout",
      value: formatLayout(guess.layout),
      kind: "text",
      tone: compareValue(
        normalizeNullable(answer.layout),
        normalizeNullable(guess.layout),
      ),
    },
    {
      label: "Keywords",
      value: formatList(guess.keywords),
      kind: "text",
      tone: compareOptionalArray(answer.keywords, guess.keywords),
    },
    {
      label: "Produces",
      value: formatProducedMana(guess.produced_mana),
      kind: "mana",
      tone: compareOptionalArray(answer.produced_mana, guess.produced_mana),
    },
  ];

  return badges;
}

function compareSupplementalInfo(
  answer: DailyCardSelectionRow,
  guess: DailyCardSelectionRow,
): CellTone {
  const layoutTone = compareValue(
    normalizeNullable(answer.layout),
    normalizeNullable(guess.layout),
  );

  const keywordsTone = compareOptionalArray(answer.keywords, guess.keywords);

  const producedManaTone = compareOptionalArray(
    answer.produced_mana,
    guess.produced_mana,
  );

  const tones = [layoutTone, keywordsTone, producedManaTone];

  if (tones.every((tone) => tone === "correct")) {
    return "correct";
  }

  if (tones.some((tone) => tone === "correct" || tone === "partial")) {
    return "partial";
  }

  if (tones.every((tone) => tone === "neutral")) {
    return "neutral";
  }

  return "wrong";
}

const LAYOUT_LABELS: Record<string, string> = {
  normal: "Normal",
  split: "Split",
  flip: "Flip",
  transform: "Transform",
  modal_dfc: "Modal DFC",
  meld: "Meld",
  leveler: "Leveler",
  class: "Class",
  case: "Case",
  saga: "Saga",
  adventure: "Adventure",
  prepare: "Prepare",
  mutate: "Mutate",
  battle: "Battle",
  planar: "Planar",
  scheme: "Scheme",
  vanguard: "Vanguard",
  reversible_card: "Reversible Card",
};

function formatLayout(layout: string | null): string {
  if (!layout) {
    return "—";
  }

  return LAYOUT_LABELS[layout] ?? layout.split("_").map(capitalize).join(" ");
}

function formatList(values: string[] | null): string {
  const normalizedValues = normalizeArray(values);

  if (normalizedValues.length === 0) {
    return "—";
  }

  return normalizedValues
    .map((value) => value.split(/[-_]/).map(capitalize).join(" "))
    .join(", ");
}

function formatProducedMana(values: string[] | null): string {
  if (!values || values.length === 0) {
    return "—";
  }

  return values.join(", ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getReleaseYearDirection(
  answerYear: number | null,
  guessYear: number | null,
): ReleaseYearDirection {
  if (answerYear == null || guessYear == null) {
    return null;
  }

  if (answerYear === guessYear) {
    return "same";
  }

  return answerYear > guessYear ? "higher" : "lower";
}

function formatSetWithYear(
  set: SetInfo | null,
  answerReleaseYear: number | null,
): SetInfo | string {
  if (!set) {
    return "—";
  }

  return {
    code: set.code.toUpperCase(),
    name: set.name,
    image_uri: set.image_uri,
    release_year: set.release_year,
    release_year_direction: getReleaseYearDirection(
      answerReleaseYear,
      set.release_year ?? null,
    ),
  };
}

function compareSetWithYear(
  answer: SetInfo | null,
  guess: SetInfo | null,
): CellTone {
  if (!answer || !guess) {
    return "neutral";
  }

  if (normalize(answer.code) === normalize(guess.code)) {
    return "correct";
  }

  if (
    answer.release_year != null &&
    guess.release_year != null &&
    answer.release_year === guess.release_year
  ) {
    return "partial";
  }

  return "wrong";
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

function compareValue(
  answer: string | number | null,
  guess: string | number | null,
): CellTone {
  if (answer == null || guess == null) {
    return "neutral";
  }

  return answer === guess ? "correct" : "wrong";
}

function compareManaValue(
  answer: string | number | null,
  guess: string | number | null,
): CellTone {
  if (answer == null || guess == null) {
    return "neutral";
  }

  const answerNumber = Number(answer);
  const guessNumber = Number(guess);

  if (Number.isNaN(answerNumber) || Number.isNaN(guessNumber)) {
    return answer === guess ? "correct" : "wrong";
  }

  if (answerNumber === guessNumber) {
    return "correct";
  }

  if (Math.abs(answerNumber - guessNumber) <= 1) {
    return "partial";
  }

  return "wrong";
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
