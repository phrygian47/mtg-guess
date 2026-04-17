import { sql } from "@/lib/db/db";
import { Card } from "./types";

type ScryfallBulkItem = {
  type: string;
  download_uri: string;
};

type ScryfallBulkResponse = {
  data: ScryfallBulkItem[];
};

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
    (item) => item.type === "default_cards",
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
  const cards = ((await cardsRes.json()) as Card[]).slice(0, 10);

  console.log("5. got cards", cards.length);

  let processed = 0;
  let inserted = 0;
  let skipped = 0;

  for (const card of cards) {
    processed++;
    console.log("processing", processed, card.name);

    if (card.lang !== "en") {
      skipped++;
      continue;
    }

    if (card.digital) {
      skipped++;
      continue;
    }

    if (!card.image_uris?.normal) {
      skipped++;
      continue;
    }

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
    inserted,
    skipped,
  };
}
