import dotenv from "dotenv";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });

type RawCardSymbol = {
  object: "card_symbol";
  symbol: string;
  svg_uri: string;
  loose_variant?: string | null;
  english: string;
  transposable: boolean;
  represents_mana: boolean;
  appears_in_mana_costs: boolean;
  mana_value?: number | null;
  cmc?: number | null;
  colors?: string[];
  gatherer_alternates?: string[] | null;
};

type SavedCardSymbol = {
  symbol: string;
  remoteSvgUri: string;
  localSvgUri: string;
  looseVariant: string | null;
  english: string;
  transposable: boolean;
  representsMana: boolean;
  appearsInManaCosts: boolean;
  manaValue: number | null;
  hybrid: boolean;
  phyrexian: boolean;
  colors: string[];
  gathererAlternates: string[] | null;
};

const SYMBOL_DIR = path.join(process.cwd(), "public", "card-symbols");

function getSymbolFilename(symbol: string) {
  const safeName = symbol
    .replaceAll("{", "")
    .replaceAll("}", "")
    .replaceAll("/", "-")
    .replaceAll("∞", "infinity")
    .replaceAll("½", "half")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `sym-${safeName || "unknown"}.svg`;
}

function isHybridSymbol(symbol: string) {
  // Examples:
  // {W/U}, {2/U}, {B/R}, {C/W}
  //
  // Phyrexian symbols like {W/P} are tracked separately.
  return symbol.includes("/") && !symbol.includes("/P}");
}

function isPhyrexianSymbol(symbol: string) {
  // Examples:
  // {W/P}, {U/P}, {B/G/P}
  return symbol.includes("/P}");
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadSymbolSvg(symbol: SavedCardSymbol) {
  const filename = getSymbolFilename(symbol.symbol);
  const diskPath = path.join(SYMBOL_DIR, filename);

  if (await fileExists(diskPath)) {
    console.log(`Skipped existing ${symbol.symbol} -> ${symbol.localSvgUri}`);
    return;
  }

  const res = await fetch(symbol.remoteSvgUri, {
    headers: {
      "User-Agent": "mtg-guess/1.0",
      Accept: "image/svg+xml",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to download ${symbol.symbol}: ${res.status} ${res.statusText}`,
    );
  }

  const svg = Buffer.from(await res.arrayBuffer());

  await writeFile(diskPath, svg);

  console.log(`Downloaded ${symbol.symbol} -> ${symbol.localSvgUri}`);

  // Be polite to Scryfall/CDN.
  await new Promise((resolve) => setTimeout(resolve, 75));
}

async function main() {
  console.log("Fetching Scryfall card symbology");

  await mkdir(SYMBOL_DIR, { recursive: true });

  const res = await fetch("https://api.scryfall.com/symbology", {
    headers: {
      "User-Agent": "mtg-guess/1.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch symbology: ${res.status} ${res.statusText}`,
    );
  }

  const data = await res.json();

  const symbols: SavedCardSymbol[] = data.data.map((symbol: RawCardSymbol) => {
    const filename = getSymbolFilename(symbol.symbol);

    return {
      symbol: symbol.symbol,
      remoteSvgUri: symbol.svg_uri,
      localSvgUri: `/card-symbols/${filename}`,
      looseVariant: symbol.loose_variant ?? null,
      english: symbol.english,
      transposable: symbol.transposable,
      representsMana: symbol.represents_mana,
      appearsInManaCosts: symbol.appears_in_mana_costs,
      manaValue: symbol.mana_value ?? symbol.cmc ?? null,
      hybrid: isHybridSymbol(symbol.symbol),
      phyrexian: isPhyrexianSymbol(symbol.symbol),
      colors: symbol.colors ?? [],
      gathererAlternates: symbol.gatherer_alternates ?? null,
    };
  });

  const { sql } = await import("@/lib/db/db");

  const shouldResetCardSymbolsTable =
    process.env.RESET_CARD_SYMBOLS_TABLE === "true";

  console.log("shouldResetCardSymbolsTable:", shouldResetCardSymbolsTable);

  if (shouldResetCardSymbolsTable) {
    await sql`truncate table card_symbols`;
    console.log("card_symbols table truncated");
  }

  for (const symbol of symbols) {
    try {
      await downloadSymbolSvg(symbol);

      await sql`
        insert into card_symbols (
            symbol
        ,   svg_uri
        ,   loose_variant
        ,   english
        ,   transposable
        ,   represents_mana
        ,   appears_in_mana_costs
        ,   mana_value
        ,   hybrid
        ,   phyrexian
        ,   colors
        ,   gatherer_alternates
        ,   updated_at
        )
        values (
            ${symbol.symbol}
        ,   ${symbol.localSvgUri}
        ,   ${symbol.looseVariant}
        ,   ${symbol.english}
        ,   ${symbol.transposable}
        ,   ${symbol.representsMana}
        ,   ${symbol.appearsInManaCosts}
        ,   ${symbol.manaValue}
        ,   ${symbol.hybrid}
        ,   ${symbol.phyrexian}
        ,   ${symbol.colors}
        ,   ${symbol.gathererAlternates}
        ,   now()
        )
        on conflict (symbol)
        do update set
            svg_uri = excluded.svg_uri,
            loose_variant = excluded.loose_variant,
            english = excluded.english,
            transposable = excluded.transposable,
            represents_mana = excluded.represents_mana,
            appears_in_mana_costs = excluded.appears_in_mana_costs,
            mana_value = excluded.mana_value,
            hybrid = excluded.hybrid,
            phyrexian = excluded.phyrexian,
            colors = excluded.colors,
            gatherer_alternates = excluded.gatherer_alternates,
            updated_at = now()
      `;

      console.log(`Symbol upserted ${symbol.symbol}: ${symbol.english}`);
    } catch (err) {
      console.error("Import failed for symbol:", symbol.symbol, err);
      throw err;
    }
  }

  console.log("Symbology import completed");

  return {
    ok: true,
    selected: symbols.length,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
