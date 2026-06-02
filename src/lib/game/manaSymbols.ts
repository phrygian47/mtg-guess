// lib/game/manaSymbols.ts

export type ManaSymbol = {
  symbol: string;
  svg_uri: string;
  english?: string | null;
};

export type ManaSymbolMap = Record<string, ManaSymbol>;

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
