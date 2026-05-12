import { sql } from "@/lib/db/db";
import { Card } from "./types";

type ScryfallBulkItem = {
  type: string;
  download_uri: string;
};

type ScryfallBulkResponse = {
  data: ScryfallBulkItem[];
};

// Add these fields to your Card type if they are not already present.
type ImportableCard = Card & {
  set_type?: string;
  set?: string;
  released_at?: string;
  oracle_id?: string | null;
};

function isExcludedSet(card: ImportableCard) {
  const setCode = card.set?.toLowerCase();
  const setType = card.set_type?.toLowerCase();

  return setType === "promo" || setCode === "sld" || setCode === "plst";
}

function isEligibleCard(card: ImportableCard) {
  if (card.lang !== "en") return false;
  if (card.digital) return false;
  if (card.border_color === "silver") return false;
  if (card.security_stamp === "acorn") return false;
  if (!card.image_uris?.normal) return false;

  if (isExcludedSet(card)) return false;

  return true;
}

function isNewerPrinting(candidate: ImportableCard, current: ImportableCard) {
  const candidateDate = candidate.released_at ?? "";
  const currentDate = current.released_at ?? "";

  if (candidateDate !== currentDate) {
    return candidateDate > currentDate;
  }

  // Stable tie-breaker when two eligible printings share the same release date.
  // This does not necessarily mean "better", just deterministic.
  return candidate.id > current.id;
}

export async function importScryfallCards() {
  console.log("1. fetching bulk list");

  const bulkRes = await fetch("https://api.scryfall.com/bulk-data", {
    cache: "no-store",
  });

  if (!bulkRes.ok) {
    throw new Error(`Failed to fetch Bulk Data list: ${bulkRes.status}`);
  }

  console.log("2. parsing bulk list");
  const bulkJson = (await bulkRes.json()) as ScryfallBulkResponse;

  const defaultCardsFile = bulkJson.data.find(
    (item) => item.type === "oracle_cards",
  );

  if (!defaultCardsFile) {
    throw new Error("Could not find default_cards file in JSON object.");
  }

  console.log("3. downloading cards file");
  const cardsRes = await fetch(defaultCardsFile.download_uri, {
    cache: "no-store",
  });

  if (!cardsRes.ok) {
    throw new Error(`Failed to download cards file: ${cardsRes.status}`);
  }

  console.log("4. parsing cards json");
  const cards = (await cardsRes.json()) as ImportableCard[];

  console.log("5. got cards", cards.length);

  let processed = 0;
  let inserted = 0;
  let skipped = 0;

  const mostRecentByOracleId = new Map<string, ImportableCard>();

  for (const card of cards) {
    processed++;

    if (!isEligibleCard(card)) {
      skipped++;
      continue;
    }

    // oracle_id groups all printings of the same Oracle card.
    // Fallback to name only in case a weird object lacks oracle_id.
    const cardKey = card.oracle_id ?? card.name;

    const existing = mostRecentByOracleId.get(cardKey);

    if (!existing || isNewerPrinting(card, existing)) {
      mostRecentByOracleId.set(cardKey, card);
    }
  }

  const cardsToInsert = [...mostRecentByOracleId.values()];

  console.log(
    "6. selected most recent eligible printings",
    cardsToInsert.length,
  );

  for (const card of cardsToInsert) {
    console.log(
      "inserting",
      inserted + 1,
      card.name,
      card.set,
      card.released_at,
    );

    try {
      await sql`
        insert into cards (
          scryfall_id,
          oracle_id,
          name,
          type_line,
          oracle_text,
          mana_cost,
          colors,
          cmc,
          set_code,
          set_name,
          rarity,
          image_small,
          image_normal,
          art_crop,
          artist,
          released_at,
          layout,
          games,
          keywords,
          power,
          toughness,
          game_changer,
          flavor_text,
          legalities,
          produced_mana
        )
        values (
          ${card.id},
          ${card.oracle_id ?? null},
          ${card.name},
          ${card.type_line ?? null},
          ${card.oracle_text ?? null},
          ${card.mana_cost ?? null},
          ${card.colors ?? []},
          ${card.cmc ?? null},
          ${card.set ?? null},
          ${card.set_name ?? null},
          ${card.rarity ?? null},
          ${card.image_uris?.small ?? null},
          ${card.image_uris?.normal ?? null},
          ${card.image_uris?.art_crop ?? null},
          ${card.artist ?? null},
          ${card.released_at ?? null},
          ${card.layout ?? null},
          ${card.games ?? []},
          ${card.keywords ?? []},
          ${card.power ?? null},
          ${card.toughness ?? null},
          ${card.game_changer ?? false},
          ${card.flavor_text ?? null},
          ${JSON.stringify(card.legalities ?? null)},
          ${card.produced_mana ?? []}
        )
        on conflict (scryfall_id)
        do update set
          oracle_id = excluded.oracle_id,
          name = excluded.name,
          type_line = excluded.type_line,
          oracle_text = excluded.oracle_text,
          mana_cost = excluded.mana_cost,
          colors = excluded.colors,
          cmc = excluded.cmc,
          set_code = excluded.set_code,
          set_name = excluded.set_name,
          rarity = excluded.rarity,
          image_small = excluded.image_small,
          image_normal = excluded.image_normal,
          art_crop = excluded.art_crop,
          artist = excluded.artist,
          released_at = excluded.released_at,
          layout = excluded.layout,
          games = excluded.games,
          keywords = excluded.keywords,
          power = excluded.power,
          toughness = excluded.toughness,
          game_changer = excluded.game_changer,
          flavor_text = excluded.flavor_text,
          legalities = excluded.legalities,
          produced_mana = excluded.produced_mana
      `;
    } catch (err) {
      console.error("insert failed for card:", card.name, card.id, err);
      throw err;
    }

    inserted++;
  }

  return {
    ok: true,
    processed,
    selected: cardsToInsert.length,
    inserted,
    skipped,
  };
}
