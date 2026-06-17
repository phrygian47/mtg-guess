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
const outputPath = path.join(
  process.cwd(),
  "public",
  "data",
  "atomic-cards.filtered.json",
);

const searchIndexOutputPath = path.join(
  outputPath,
  "card-name-search-index.json",
);
const sourceOutputPath = path.join(outputPath, "cards-by-id.json");

function shouldKeepCard(card: CardAtomic): boolean {
  if (card.isFunny === true) return false; //No unset or joke set cards
  if (card.layout === "art_series") return false; //No art cards
  if (card.types?.includes("Token")) return false; //No tokens
  if (card.type?.includes("Token")) return false;
  if (card.type === "Card") return false; //No memorabilia or jumpstart face cards
  return true;
}

function getCardId(card: CardAtomic): string {
  return (
    card.identifiers?.scryfallOracleId ??
    card.identifiers?.scryfallId ??
    card.name
  );
}

export async function ImportCards() {
  const raw = await fs.readFile(inputPath, "utf8");
  const json = JSON.parse(raw) as AtomicCardsFile;

  const searchDocs: SearchCard[] = [];
  const cardsById: Record<string, CardSourceOfTruth> = {};

  for (const cardVersions of Object.values(json.data)) {
    for (const card of cardVersions) {
      if (!shouldKeepCard(card)) continue;

      const id = getCardId(card);

      const sourceCard: CardSourceOfTruth = {
        ...card,
        id,
      };

      cardsById[id] = sourceCard;

      searchDocs.push({
        id,
        name: card.name,
      });
    }
  }

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

  await fs.mkdir(outputPath, { recursive: true });

  await fs.writeFile(
    searchIndexOutputPath,
    JSON.stringify(miniSearch.toJSON()),
  );

  await fs.writeFile(sourceOutputPath, JSON.stringify(cardsById));

  console.log(`Wrote ${searchDocs.length} searchable cards`);
  console.log(`Search index: ${searchIndexOutputPath}`);
  console.log(`Source data: ${sourceOutputPath}`);
}
