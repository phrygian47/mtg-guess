import { sql } from "@/lib/db/db";
import { Card } from "./types";

type ScryfallBulkItem = {
  type: string;
  download_uri: string;
};

type ScryfallBulkResponse = {
  data: ScryfallBulkItem[];
};

type ImportableCard = Card & {
  set_type?: string;
  set?: string;
  released_at?: string;
  oracle_id?: string | null;
};

function getPrimaryFace(card: ImportableCard) {
  return card.card_faces?.[0];
}

function getImageUris(card: ImportableCard) {
  if (card.image_uris) {
    return card.image_uris;
  }

  return getPrimaryFace(card)?.image_uris;
}

function getTypeLine(card: ImportableCard) {
  return card.type_line ?? getPrimaryFace(card)?.type_line ?? null;
}

function getOracleText(card: ImportableCard) {
  return card.oracle_text ?? getPrimaryFace(card)?.oracle_text ?? null;
}

function getManaCost(card: ImportableCard) {
  return card.mana_cost ?? getPrimaryFace(card)?.mana_cost ?? null;
}

function getColors(card: ImportableCard) {
  return card.colors ?? getPrimaryFace(card)?.colors ?? [];
}

function getPower(card: ImportableCard) {
  return card.power ?? getPrimaryFace(card)?.power ?? null;
}

function getToughness(card: ImportableCard) {
  return card.toughness ?? getPrimaryFace(card)?.toughness ?? null;
}

function getLoyalty(card: ImportableCard) {
  return card.loyalty ?? getPrimaryFace(card)?.loyalty ?? null;
}

function isEligibleCard(card: ImportableCard) {
  if (!card.oracle_id) return false;
  if (card.digital) return false;
  if (card.border_color === "silver") return false;
  if (card.security_stamp === "acorn") return false;
  if (!getImageUris(card)?.normal) return false;
  if (card.layout === "token") return false;
  if (card.set_type === "memorabilia") return false;

  return true;
}

export async function importScryfallCards() {
  console.log("1. fetching bulk list");

  await sql`truncate table card_pool, cards restart identity`;

  const bulkRes = await fetch("https://api.scryfall.com/bulk-data", {
    cache: "no-store",
  });

  if (!bulkRes.ok) {
    throw new Error(`Failed to fetch bulk data list: ${bulkRes.status}`);
  }

  console.log("2. parsing bulk list");
  const bulkJson = (await bulkRes.json()) as ScryfallBulkResponse;

  const oracleCardsFile = bulkJson.data.find(
    (item) => item.type === "oracle_cards",
  );

  if (!oracleCardsFile) {
    throw new Error("Could not find oracle_cards bulk file.");
  }

  console.log("3. downloading oracle cards file");
  const cardsRes = await fetch(oracleCardsFile.download_uri, {
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

  const cardsToInsert = cards.filter((card) => {
    processed++;

    if (!isEligibleCard(card)) {
      skipped++;
      return false;
    }

    return true;
  });

  console.log("6. selected eligible cards", cardsToInsert.length);

  for (const card of cardsToInsert) {
    console.log(
      "inserting",
      inserted + 1,
      card.name,
      card.set,
      card.released_at,
    );

    const imageUris = getImageUris(card);

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
          loyalty,
          game_changer,
          flavor_text,
          legalities,
          produced_mana
        )
        values (
          ${card.id},
          ${card.oracle_id},
          ${card.name},
          ${getTypeLine(card)},
          ${getOracleText(card)},
          ${getManaCost(card)},
          ${getColors(card)},
          ${card.cmc ?? null},
          ${card.set ?? null},
          ${card.set_name ?? null},
          ${card.rarity ?? null},
          ${imageUris?.small ?? null},
          ${imageUris?.normal ?? null},
          ${imageUris?.art_crop ?? null},
          ${card.artist ?? null},
          ${card.released_at ?? null},
          ${card.layout ?? null},
          ${card.games ?? []},
          ${card.keywords ?? []},
          ${getPower(card)},
          ${getToughness(card)},
          ${getLoyalty(card)},
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
          loyalty = excluded.loyalty,
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
