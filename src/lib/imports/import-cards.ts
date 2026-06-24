import fs from "node:fs/promises";
import path from "node:path";
import { DuckDBConnection } from "@duckdb/node-api";
import MiniSearch from "minisearch";
import type { CardAtomic } from "./types";

type AtomicCardsFile = {
  meta?: unknown;
  data: Record<string, CardAtomic[]>;
};

type SearchCard = {
  id: string;
  name: string;
};

type CardSourceOfTruth = CardAtomic & {
  id: string;
};

type DbCardRow = {
  scryfall_id: string;
  oracle_id: string;
  name: string;
  type_line: string | null;
  oracle_text: string | null;
  mana_cost: string | null;
  colors: string[];
  cmc: number | null;
  set_code: string | null;
  set_name: string | null;
  rarity: string | null;
  image_small: string | null;
  image_normal: string | null;
  art_crop: string | null;
  artist: string | null;
  released_at: string | null;
  layout: string | null;
  games: string[];
  keywords: string[];
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  game_changer: boolean;
  flavor_text: string | null;
  legalities: Record<string, string> | null;
  produced_mana: string[];
  normalized_name: string;
  edhrec_rank: number | null;
  edhrec_saltiness: number | null;
};

type ImportBatchSummary = {
  inserted: number;
  updated: number;
};

type SetReleaseDateRow = {
  code?: unknown;
  release_date?: unknown;
};

type SetReleaseDateByCode = Map<string, string>;

type CardPrintingMetadataRow = {
  oracle_id?: unknown;
  scryfall_id?: unknown;
  set_code?: unknown;
  set_name?: unknown;
  release_date?: unknown;
  rarity?: unknown;
  artist?: unknown;
  flavor_text?: unknown;
  games?: unknown;
};

type CardPrintingMetadata = {
  scryfall_id: string;
  set_code: string | null;
  set_name: string | null;
  release_date: string | null;
  rarity: string | null;
  image_small: string | null;
  image_normal: string | null;
  art_crop: string | null;
  artist: string | null;
  flavor_text: string | null;
  games: string[];
};

type CardPrintingMetadataByOracleId = Map<string, CardPrintingMetadata>;

const inputPath = path.join(process.cwd(), "data", "AtomicCards.json");

const setMetadataPath = path.join(
  process.cwd(),
  "data",
  "CardData",
  "sets.parquet",
);

const cardPrintingsPath = path.join(
  process.cwd(),
  "data",
  "CardData",
  "cards.parquet",
);

const cardIdentifiersPath = path.join(
  process.cwd(),
  "data",
  "CardData",
  "cardIdentifiers.parquet",
);

const outputDir = path.join(process.cwd(), "public", "data");

const searchIndexOutputPath = path.join(
  outputDir,
  "card-name-search-index.json",
);

const sourceOutputPath = path.join(outputDir, "cards-by-id.json");

const DB_BATCH_SIZE = 500;
const EXCLUDED_SET_TYPES = new Set([
  "promo",
  "token",
  "memorabilia",
  "minigame",
]);

function shouldKeepCard(card: CardAtomic): boolean {
  if (!card.identifiers.scryfallOracleId) return false;
  if (card.isFunny === true) return false; // No un-set or joke-set cards
  if (card.layout === "art_series") return false; // No art cards
  if (card.types?.includes("Token")) return false; // No tokens
  if (card.type?.includes("Token")) return false;
  if (card.type === "Card") return false; // No memorabilia or jumpstart face cards

  return true;
}

function getCardId(card: CardAtomic): string {
  return card.identifiers.scryfallOracleId!;
}

function pickPreferredCard(
  current: CardSourceOfTruth | undefined,
  next: CardSourceOfTruth,
): CardSourceOfTruth {
  if (!current) return next;

  /**
   * AtomicCards can contain multiple entries that resolve to the same ID,
   * especially when using scryfallOracleId.
   *
   * Since AtomicCards does not include language, exact release date, rarity,
   * or digital/paper flags, the safest deterministic choice is to keep the
   * first card encountered.
   */
  return current;
}

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[-/]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSetCodeValue(value: string | undefined): string | null {
  return value?.trim().toLowerCase() || null;
}

function compareSetReleaseDates(
  leftCode: string,
  rightCode: string,
  setReleaseDateByCode: SetReleaseDateByCode,
): number {
  const leftReleaseDate = setReleaseDateByCode.get(leftCode);
  const rightReleaseDate = setReleaseDateByCode.get(rightCode);

  if (leftReleaseDate && rightReleaseDate) {
    return leftReleaseDate.localeCompare(rightReleaseDate);
  }

  if (leftReleaseDate) {
    return -1;
  }

  if (rightReleaseDate) {
    return 1;
  }

  return 0;
}

function normalizeSetCode(
  card: CardAtomic,
  setReleaseDateByCode: SetReleaseDateByCode,
): string | null {
  const firstPrinting = normalizeSetCodeValue(card.firstPrinting);

  if (firstPrinting && setReleaseDateByCode.has(firstPrinting)) {
    return firstPrinting;
  }

  const printings = compactStringArray(card.printings)
    .map((setCode) => normalizeSetCodeValue(setCode))
    .filter((setCode): setCode is string => setCode !== null)
    .filter((setCode) => setReleaseDateByCode.has(setCode));

  if (printings.length === 0) {
    return null;
  }

  return printings.reduce((earliestSetCode, setCode) =>
    compareSetReleaseDates(setCode, earliestSetCode, setReleaseDateByCode) < 0
      ? setCode
      : earliestSetCode,
  );
}

function compactStringArray(values: string[] | undefined): string[] {
  return values?.map((value) => value.trim()).filter(Boolean) ?? [];
}

function toNullableString(value: string | undefined): string | null {
  return value?.trim() || null;
}

function normalizeUnknownString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCommaSeparatedList(value: unknown): string[] {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getScryfallImageUri(
  scryfallId: string | null,
  size: "small" | "normal" | "art_crop",
): string | null {
  if (!scryfallId || scryfallId.length < 2) {
    return null;
  }

  return `https://cards.scryfall.io/${size}/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
}

function toDbCardRow(
  card: CardSourceOfTruth,
  setReleaseDateByCode: SetReleaseDateByCode,
  cardPrintingMetadataByOracleId: CardPrintingMetadataByOracleId,
): DbCardRow {
  const oracleId = card.identifiers.scryfallOracleId!;
  const printingMetadata = cardPrintingMetadataByOracleId.get(
    oracleId.toLowerCase(),
  );

  return {
    scryfall_id: printingMetadata?.scryfall_id ?? card.identifiers.scryfallId ?? oracleId,
    oracle_id: oracleId,
    name: card.name,
    type_line: toNullableString(card.type),
    oracle_text: toNullableString(card.text),
    mana_cost: toNullableString(card.manaCost),
    colors: compactStringArray(card.colors),
    cmc: card.manaValue ?? card.convertedManaCost ?? null,
    set_code:
      printingMetadata?.set_code ?? normalizeSetCode(card, setReleaseDateByCode),
    set_name: printingMetadata?.set_name ?? null,
    rarity: printingMetadata?.rarity ?? null,
    image_small: printingMetadata?.image_small ?? null,
    image_normal: printingMetadata?.image_normal ?? null,
    art_crop: printingMetadata?.art_crop ?? null,
    artist: printingMetadata?.artist ?? null,
    released_at: printingMetadata?.release_date ?? null,
    layout: toNullableString(card.layout),
    games: printingMetadata?.games ?? [],
    keywords: compactStringArray(card.keywords),
    power: toNullableString(card.power),
    toughness: toNullableString(card.toughness),
    loyalty: toNullableString(card.loyalty),
    game_changer: card.isGameChanger ?? false,
    flavor_text: printingMetadata?.flavor_text ?? null,
    legalities: card.legalities ?? null,
    produced_mana: compactStringArray(card.producedMana),
    normalized_name: normalizeName(card.name),
    edhrec_rank: card.edhrecRank ?? null,
    edhrec_saltiness: card.edhrecSaltiness ?? null,
  };
}

function toDuckDbPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/'/g, "''");
}

async function loadSetReleaseDateByCode(): Promise<SetReleaseDateByCode> {
  const connection = await DuckDBConnection.create();

  try {
    const reader = await connection.runAndReadAll(`
      select
          lower(code) as code
        , releaseDate as release_date
      from read_parquet('${toDuckDbPath(setMetadataPath)}')
      where code is not null
        and releaseDate is not null
        and coalesce(isOnlineOnly, false) = false
        and lower(coalesce(type, '')) not in (${[...EXCLUDED_SET_TYPES]
          .map((setType) => `'${setType}'`)
          .join(", ")})
    `);

    const setReleaseDateByCode: SetReleaseDateByCode = new Map();

    for (const row of reader.getRowObjectsJson() as SetReleaseDateRow[]) {
      if (typeof row.code !== "string" || typeof row.release_date !== "string") {
        continue;
      }

      setReleaseDateByCode.set(row.code, row.release_date);
    }

    return setReleaseDateByCode;
  } finally {
    connection.closeSync();
  }
}

async function loadCardPrintingMetadataByOracleId(): Promise<CardPrintingMetadataByOracleId> {
  const connection = await DuckDBConnection.create();

  try {
    const reader = await connection.runAndReadAll(`
      with printing_candidates as (
        select
            lower(i.scryfallOracleId) as oracle_id
          , i.scryfallId as scryfall_id
          , lower(c.setCode) as set_code
          , s.name as set_name
          , s.releaseDate as release_date
          , c.rarity
          , c.artist
          , c.flavorText as flavor_text
          , c.availability as games
          , row_number() over (
              partition by lower(i.scryfallOracleId)
              order by
                  s.releaseDate asc nulls last
                , case when c.isOnlineOnly = true then 1 else 0 end
                , case when c.isPromo = true then 1 else 0 end
                , c.uuid
            ) as rank
        from read_parquet('${toDuckDbPath(cardPrintingsPath)}') c
        join read_parquet('${toDuckDbPath(cardIdentifiersPath)}') i
          on i.uuid = c.uuid
        left join read_parquet('${toDuckDbPath(setMetadataPath)}') s
          on lower(s.code) = lower(c.setCode)
        where i.scryfallOracleId is not null
          and i.scryfallId is not null
          and c.language = 'English'
          and coalesce(c.isOnlineOnly, false) = false
          and coalesce(c.isPromo, false) = false
          and lower(coalesce(c.availability, '')) like '%paper%'
          and coalesce(s.isOnlineOnly, false) = false
          and lower(coalesce(s.type, '')) not in (${[...EXCLUDED_SET_TYPES]
            .map((setType) => `'${setType}'`)
            .join(", ")})
      )
      select
          oracle_id
        , scryfall_id
        , set_code
        , set_name
        , release_date
        , rarity
        , artist
        , flavor_text
        , games
      from printing_candidates
      where rank = 1
    `);

    const cardPrintingMetadataByOracleId: CardPrintingMetadataByOracleId =
      new Map();

    for (const row of reader.getRowObjectsJson() as CardPrintingMetadataRow[]) {
      const oracleId = normalizeUnknownString(row.oracle_id);
      const scryfallId = normalizeUnknownString(row.scryfall_id);

      if (!oracleId || !scryfallId) {
        continue;
      }

      cardPrintingMetadataByOracleId.set(oracleId, {
        scryfall_id: scryfallId,
        set_code: normalizeUnknownString(row.set_code),
        set_name: normalizeUnknownString(row.set_name),
        release_date: normalizeUnknownString(row.release_date),
        rarity: normalizeUnknownString(row.rarity),
        image_small: getScryfallImageUri(scryfallId, "small"),
        image_normal: getScryfallImageUri(scryfallId, "normal"),
        art_crop: getScryfallImageUri(scryfallId, "art_crop"),
        artist: normalizeUnknownString(row.artist),
        flavor_text: normalizeUnknownString(row.flavor_text),
        games: parseCommaSeparatedList(row.games),
      });
    }

    return cardPrintingMetadataByOracleId;
  } finally {
    connection.closeSync();
  }
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function importCardsToDatabase(
  cards: CardSourceOfTruth[],
  setReleaseDateByCode: SetReleaseDateByCode,
  cardPrintingMetadataByOracleId: CardPrintingMetadataByOracleId,
): Promise<ImportBatchSummary> {
  const { sql } = await import("@/lib/db/db");
  const summary: ImportBatchSummary = { inserted: 0, updated: 0 };
  let batchIndex = 0;

  await sql`
    alter table cards
      add column if not exists edhrec_rank integer,
      add column if not exists edhrec_saltiness numeric
  `;

  for (const batch of chunk(
    cards.map((card) =>
      toDbCardRow(card, setReleaseDateByCode, cardPrintingMetadataByOracleId),
    ),
    DB_BATCH_SIZE,
  )) {
    batchIndex++;

    const rows = (await sql`
      with incoming as (
        select *
        from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as x(
            scryfall_id text
          , oracle_id uuid
          , name text
          , type_line text
          , oracle_text text
          , mana_cost text
          , colors text[]
          , cmc numeric
          , set_code text
          , set_name text
          , rarity text
          , image_small text
          , image_normal text
          , art_crop text
          , artist text
          , released_at date
          , layout text
          , games text[]
          , keywords text[]
          , power text
          , toughness text
          , loyalty text
          , game_changer boolean
          , flavor_text text
          , legalities jsonb
          , produced_mana text[]
          , normalized_name text
          , edhrec_rank integer
          , edhrec_saltiness numeric
        )
      )
      insert into cards (
          scryfall_id
        , oracle_id
        , name
        , type_line
        , oracle_text
        , mana_cost
        , colors
        , cmc
        , set_code
        , set_name
        , rarity
        , image_small
        , image_normal
        , art_crop
        , artist
        , released_at
        , layout
        , games
        , keywords
        , power
        , toughness
        , loyalty
        , game_changer
        , flavor_text
        , legalities
        , produced_mana
        , normalized_name
        , edhrec_rank
        , edhrec_saltiness
      )
      select
          incoming.scryfall_id
        , incoming.oracle_id
        , incoming.name
        , incoming.type_line
        , incoming.oracle_text
        , incoming.mana_cost
        , incoming.colors
        , incoming.cmc
        , incoming.set_code
        , coalesce(incoming.set_name, sets.name)
        , incoming.rarity
        , incoming.image_small
        , incoming.image_normal
        , incoming.art_crop
        , incoming.artist
        , incoming.released_at
        , incoming.layout
        , incoming.games
        , incoming.keywords
        , incoming.power
        , incoming.toughness
        , incoming.loyalty
        , incoming.game_changer
        , incoming.flavor_text
        , incoming.legalities
        , incoming.produced_mana
        , incoming.normalized_name
        , incoming.edhrec_rank
        , incoming.edhrec_saltiness
      from incoming
      left join sets
        on sets.code = incoming.set_code
      on conflict (oracle_id) do update set
          name = excluded.name
        , type_line = excluded.type_line
        , oracle_text = excluded.oracle_text
        , mana_cost = excluded.mana_cost
        , colors = excluded.colors
        , cmc = excluded.cmc
        , scryfall_id = excluded.scryfall_id
        , set_code = excluded.set_code
        , set_name = coalesce(excluded.set_name, cards.set_name)
        , rarity = coalesce(excluded.rarity, cards.rarity)
        , image_small = excluded.image_small
        , image_normal = excluded.image_normal
        , art_crop = excluded.art_crop
        , artist = coalesce(excluded.artist, cards.artist)
        , released_at = coalesce(excluded.released_at, cards.released_at)
        , layout = excluded.layout
        , games = excluded.games
        , keywords = excluded.keywords
        , power = excluded.power
        , toughness = excluded.toughness
        , loyalty = excluded.loyalty
        , game_changer = excluded.game_changer
        , flavor_text = coalesce(excluded.flavor_text, cards.flavor_text)
        , legalities = coalesce(excluded.legalities, cards.legalities)
        , produced_mana = excluded.produced_mana
        , normalized_name = excluded.normalized_name
        , edhrec_rank = excluded.edhrec_rank
        , edhrec_saltiness = excluded.edhrec_saltiness
      returning (xmax = 0) as inserted
    `) as { inserted: boolean }[];

    const inserted = rows.filter((row) => row.inserted).length;
    summary.inserted += inserted;
    summary.updated += rows.length - inserted;

    console.log(
      `Imported batch ${batchIndex}/${Math.ceil(
        cards.length / DB_BATCH_SIZE,
      )}: ${rows.length} cards`,
    );
  }

  return summary;
}

export async function ImportCards() {
  const raw = await fs.readFile(inputPath, "utf8");
  const json = JSON.parse(raw) as AtomicCardsFile;
  const [setReleaseDateByCode, cardPrintingMetadataByOracleId] =
    await Promise.all([
      loadSetReleaseDateByCode(),
      loadCardPrintingMetadataByOracleId(),
    ]);

  const cardsById: Record<string, CardSourceOfTruth> = {};

  for (const cardVersions of Object.values(json.data)) {
    for (const card of cardVersions) {
      if (!shouldKeepCard(card)) continue;

      const id = getCardId(card);

      const sourceCard: CardSourceOfTruth = {
        ...card,
        id,
      };

      cardsById[id] = pickPreferredCard(cardsById[id], sourceCard);
    }
  }

  const searchDocs: SearchCard[] = Object.values(cardsById).map((card) => ({
    id: card.id,
    name: card.name,
  }));

  const miniSearch = new MiniSearch<SearchCard>({
    idField: "id",
    fields: ["name"],
    storeFields: ["id", "name"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
    },
  });

  miniSearch.addAll(searchDocs);

  await fs.mkdir(outputDir, { recursive: true });

  await fs.writeFile(
    searchIndexOutputPath,
    JSON.stringify(miniSearch.toJSON()),
    "utf8",
  );

  await fs.writeFile(sourceOutputPath, JSON.stringify(cardsById), "utf8");

  const dbSummary = await importCardsToDatabase(
    Object.values(cardsById),
    setReleaseDateByCode,
    cardPrintingMetadataByOracleId,
  );

  console.log(`Wrote ${searchDocs.length} searchable cards`);
  console.log(`Search index: ${searchIndexOutputPath}`);
  console.log(`Source data: ${sourceOutputPath}`);
  console.log(
    `Imported ${dbSummary.inserted} new cards and updated ${dbSummary.updated} existing cards in Neon`,
  );

  return {
    searchableCards: searchDocs.length,
    sourceCards: Object.keys(cardsById).length,
    dbInsertedCards: dbSummary.inserted,
    dbUpdatedCards: dbSummary.updated,
    searchIndexOutputPath,
    sourceOutputPath,
  };
}
