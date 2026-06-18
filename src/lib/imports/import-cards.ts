import fs from "node:fs/promises";
import path from "node:path";
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

const inputPath = path.join(process.cwd(), "data", "AtomicCards.json");

const outputDir = path.join(process.cwd(), "public", "data");

const searchIndexOutputPath = path.join(
  outputDir,
  "card-name-search-index.json",
);

const sourceOutputPath = path.join(outputDir, "cards-by-id.json");

function shouldKeepCard(card: CardAtomic): boolean {
  if (card.isFunny === true) return false; // No un-set or joke-set cards
  if (card.layout === "art_series") return false; // No art cards
  if (card.types?.includes("Token")) return false; // No tokens
  if (card.type?.includes("Token")) return false;
  if (card.type === "Card") return false; // No memorabilia or jumpstart face cards

  return true;
}

function getCardId(card: CardAtomic): string {
  return (
    card.identifiers.scryfallOracleId ??
    card.identifiers.scryfallId ??
    card.name
  );
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
   * Since your CardAtomic type does not include language, release date,
   * rarity, set code, or digital/paper flags, the safest deterministic choice
   * is to keep the first card encountered.
   */
  return current;
}

export async function ImportCards() {
  const raw = await fs.readFile(inputPath, "utf8");
  const json = JSON.parse(raw) as AtomicCardsFile;

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

  console.log(`Wrote ${searchDocs.length} searchable cards`);
  console.log(`Search index: ${searchIndexOutputPath}`);
  console.log(`Source data: ${sourceOutputPath}`);

  return {
    searchableCards: searchDocs.length,
    sourceCards: Object.keys(cardsById).length,
    searchIndexOutputPath,
    sourceOutputPath,
  };
}
