// lib/game/manaSymbols.ts

export type ManaSymbol = {
  symbol: string;
  svg_uri: string;
  english?: string | null;
};

export type ManaSymbolMap = Record<string, ManaSymbol>;

export type ParsedManaCostSymbol = {
  raw: string;
  symbol: string;
  src: string;
  alt: string;
};

export type ParsedSymbolTextToken =
  | {
      type: "text";
      value: string;
    }
  | ({
      type: "symbol";
    } & ParsedManaCostSymbol);

export async function fetchManaSymbols(): Promise<ManaSymbolMap> {
  const res = await fetch("/api/cards/symbology");

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch mana symbols: ${res.status} ${body}`);
  }

  const symbols: ManaSymbol[] = await res.json();

  return Object.fromEntries(
    symbols.map((symbol) => [symbol.symbol.replace(/[{}]/g, ""), symbol]),
  );
}

export function parseManaCost(manaCost: string | null | undefined) {
  if (!manaCost) {
    return [];
  }

  return parseSymbolText(manaCost).filter((token) => token.type === "symbol");
}

export function parseSymbolText(
  text: string | null | undefined,
): ParsedSymbolTextToken[] {
  if (!text) {
    return [];
  }

  const tokens: ParsedSymbolTextToken[] = [];
  const symbolPattern = /\{([^}]+)\}/g;
  let lastIndex = 0;

  for (const match of text.matchAll(symbolPattern)) {
    const raw = match[0];
    const symbol = match[1].trim();
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      tokens.push({
        type: "text",
        value: text.slice(lastIndex, matchIndex),
      });
    }

    tokens.push({
      type: "symbol",
      raw,
      symbol,
      src: `/card-symbols/sym-${normalizeManaSymbolAssetName(symbol)}.svg`,
      alt: `${symbol} symbol`,
    });

    lastIndex = matchIndex + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

function normalizeManaSymbolAssetName(symbol: string) {
  return symbol
    .toLowerCase()
    .replace("∞", "infinity")
    .replace("½", "half")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
