import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import path from "node:path";
import { gunzipSync } from "node:zlib";
import { DuckDBConnection } from "@duckdb/node-api";

// Builds card_printings: one row per English paper printing, with prices.
// Separate from `cards` (one row per card, used by the guessing games).
//   npm run import:printings                 full import (printings + prices)
//   npm run import:printings -- --prices-only  refresh prices only (fast)

const PRICES_URL = "https://mtgjson.com/api/v5/AllPricesToday.json.gz";
const BATCH_SIZE = 1000;

const dataPath = (file: string) =>
  path.join(process.cwd(), "data", "CardData", file).replace(/\\/g, "/");

type PrintingRow = {
  uuid: string;
  oracle_id: string | null;
  scryfall_id: string;
  name: string;
  set_code: string;
  set_name: string | null;
  set_type: string | null;
  collector_number: string | null;
  released_at: string | null;
  rarity: string | null;
  finishes: string[];
  is_promo: boolean;
  image_small: string;
  image_normal: string;
};

type PriceRow = {
  uuid: string;
  price_usd: number | null;
  price_usd_foil: number | null;
  price_eur: number | null;
  price_source: string | null;
};

type FinishPrices = Record<string, Record<string, number>>;
type ProviderPrices = { retail?: FinishPrices; currency?: string };

function scryfallImage(scryfallId: string, size: "small" | "normal") {
  return `https://cards.scryfall.io/${size}/front/${scryfallId[0]}/${scryfallId[1]}/${scryfallId}.jpg`;
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function latestRetailPrice(
  provider: ProviderPrices | undefined,
  ...finishes: string[]
): number | null {
  for (const finish of finishes) {
    const byDate = provider?.retail?.[finish];

    if (!byDate) continue;

    const latestDate = Object.keys(byDate).sort().at(-1);
    const price = latestDate ? byDate[latestDate] : undefined;

    if (typeof price === "number" && price > 0) return price;
  }

  return null;
}

async function loadPrintings(): Promise<PrintingRow[]> {
  const connection = await DuckDBConnection.create();

  try {
    const reader = await connection.runAndReadAll(`
      select
          c.uuid
        , lower(i.scryfallOracleId) as oracle_id
        , i.scryfallId as scryfall_id
        , c.name
        , lower(c.setCode) as set_code
        , s.name as set_name
        , s.type as set_type
        , c.number as collector_number
        , s.releaseDate as released_at
        , c.rarity
        , c.finishes
        , coalesce(c.isPromo, false) as is_promo
      from read_parquet('${dataPath("cards.parquet")}') c
      join read_parquet('${dataPath("cardIdentifiers.parquet")}') i
        on i.uuid = c.uuid
      left join read_parquet('${dataPath("sets.parquet")}') s
        on lower(s.code) = lower(c.setCode)
      where c.language = 'English'
        and lower(coalesce(c.availability, '')) like '%paper%'
        and coalesce(c.isOnlineOnly, false) = false
        and coalesce(s.isOnlineOnly, false) = false
        and (c.side is null or c.side = 'a')
        and coalesce(c.layout, '') <> 'art_series'
        and i.scryfallId is not null
    `);

    return (reader.getRowObjectsJson() as Record<string, unknown>[]).map(
      (row) => ({
        uuid: row.uuid as string,
        oracle_id: (row.oracle_id as string | null) ?? null,
        scryfall_id: row.scryfall_id as string,
        name: row.name as string,
        set_code: row.set_code as string,
        set_name: (row.set_name as string | null) ?? null,
        set_type: (row.set_type as string | null) ?? null,
        collector_number: (row.collector_number as string | null) ?? null,
        released_at: (row.released_at as string | null) ?? null,
        rarity: (row.rarity as string | null) ?? null,
        finishes: ((row.finishes as string | null) ?? "")
          .split(",")
          .map((finish) => finish.trim())
          .filter(Boolean),
        is_promo: row.is_promo === true,
        image_small: scryfallImage(row.scryfall_id as string, "small"),
        image_normal: scryfallImage(row.scryfall_id as string, "normal"),
      }),
    );
  } finally {
    connection.closeSync();
  }
}

async function loadPrices(): Promise<PriceRow[]> {
  console.log("Downloading MTGJSON price feed...");

  const res = await fetch(PRICES_URL, {
    headers: { "User-Agent": "mtgdle/1.0" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to download prices: ${res.status}`);
  }

  const feed = JSON.parse(
    gunzipSync(Buffer.from(await res.arrayBuffer())).toString("utf8"),
  ) as {
    meta: { date: string };
    data: Record<string, { paper?: Record<string, ProviderPrices> }>;
  };

  console.log(`Price feed dated ${feed.meta.date}`);

  const rows: PriceRow[] = [];

  for (const [uuid, entry] of Object.entries(feed.data)) {
    const paper = entry.paper;

    if (!paper) continue;

    const tcg = paper.tcgplayer;
    const kingdom = paper.cardkingdom;

    const tcgUsd = latestRetailPrice(tcg, "normal");
    const kingdomUsd = latestRetailPrice(kingdom, "normal");
    const usd = tcgUsd ?? kingdomUsd;
    const usdFoil =
      latestRetailPrice(tcg, "foil", "etched") ??
      latestRetailPrice(kingdom, "foil", "etched");
    const eur = latestRetailPrice(paper.cardmarket, "normal");

    if (usd === null && usdFoil === null && eur === null) continue;

    rows.push({
      uuid,
      price_usd: usd,
      price_usd_foil: usdFoil,
      price_eur: eur,
      price_source:
        tcgUsd !== null ? "tcgplayer" : kingdomUsd !== null ? "cardkingdom" : null,
    });
  }

  return rows;
}

async function main() {
  const pricesOnly = process.argv.includes("--prices-only");
  const { sql } = await import("@/lib/db/db");

  await sql`
    create table if not exists card_printings (
        uuid text primary key
      , oracle_id uuid
      , scryfall_id text not null
      , name text not null
      , set_code text not null
      , set_name text
      , set_type text
      , collector_number text
      , released_at date
      , rarity text
      , finishes text[] not null default '{}'
      , is_promo boolean not null default false
      , image_small text not null
      , image_normal text not null
      , price_usd numeric
      , price_usd_foil numeric
      , price_eur numeric
      , price_source text
      , price_updated_at timestamptz
    )
  `;
  await sql`
    create index if not exists card_printings_oracle_id_idx
      on card_printings (oracle_id)
  `;

  if (!pricesOnly) {
    const printings = await loadPrintings();
    console.log(`Importing ${printings.length} printings...`);

    let imported = 0;

    for (const batch of chunk(printings, BATCH_SIZE)) {
      await sql`
        insert into card_printings (
            uuid, oracle_id, scryfall_id, name, set_code, set_name, set_type
          , collector_number, released_at, rarity, finishes, is_promo
          , image_small, image_normal
        )
        select
            x.uuid, x.oracle_id, x.scryfall_id, x.name, x.set_code, x.set_name
          , x.set_type, x.collector_number, x.released_at, x.rarity, x.finishes
          , x.is_promo, x.image_small, x.image_normal
        from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as x(
            uuid text
          , oracle_id uuid
          , scryfall_id text
          , name text
          , set_code text
          , set_name text
          , set_type text
          , collector_number text
          , released_at date
          , rarity text
          , finishes text[]
          , is_promo boolean
          , image_small text
          , image_normal text
        )
        on conflict (uuid) do update set
            oracle_id = excluded.oracle_id
          , scryfall_id = excluded.scryfall_id
          , name = excluded.name
          , set_code = excluded.set_code
          , set_name = excluded.set_name
          , set_type = excluded.set_type
          , collector_number = excluded.collector_number
          , released_at = excluded.released_at
          , rarity = excluded.rarity
          , finishes = excluded.finishes
          , is_promo = excluded.is_promo
          , image_small = excluded.image_small
          , image_normal = excluded.image_normal
      `;

      imported += batch.length;
      console.log(`Imported ${imported}/${printings.length}`);
    }
  }

  const prices = await loadPrices();
  const runStartedAt = new Date().toISOString();
  let priced = 0;

  for (const batch of chunk(prices, BATCH_SIZE)) {
    const result = (await sql`
      update card_printings
      set
          price_usd = x.price_usd
        , price_usd_foil = x.price_usd_foil
        , price_eur = x.price_eur
        , price_source = x.price_source
        , price_updated_at = ${runStartedAt}::timestamptz
      from jsonb_to_recordset(${JSON.stringify(batch)}::jsonb) as x(
          uuid text
        , price_usd numeric
        , price_usd_foil numeric
        , price_eur numeric
        , price_source text
      )
      where card_printings.uuid = x.uuid
      returning card_printings.uuid
    `) as { uuid: string }[];

    priced += result.length;
  }

  const cleared = (await sql`
    update card_printings
    set price_usd = null, price_usd_foil = null, price_eur = null, price_source = null
    where price_updated_at < ${runStartedAt}::timestamptz
    returning uuid
  `) as { uuid: string }[];

  const totals = (await sql`
    select
        count(*)::int as printings
      , count(*) filter (where price_usd is not null or price_usd_foil is not null)::int as with_usd
    from card_printings
  `) as { printings: number; with_usd: number }[];

  console.log(
    `Done. ${priced} printings priced, ${cleared.length} stale prices cleared. ` +
      `${totals[0].printings} printings total, ${totals[0].with_usd} with a USD price.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
