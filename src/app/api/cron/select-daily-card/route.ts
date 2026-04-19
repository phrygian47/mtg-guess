import { sql } from "@/lib/db/db";
import { Card } from "@/lib/scryfall/types";
import { fetchRandomSelectedCard } from "@/lib/scryfall/save-selected";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unathorized", { status: 401 });
  }
  let card: Card | null = null;
  try {
    card = await fetchRandomSelectedCard();

    console.log("Fetched card:", {
      id: card.id,
      name: card.name,
      set: card.set,
    });

    const rows = await sql`
        insert into dailycardselections(
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
          produced_mana,
          puzzle_date
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
          ${card.produced_mana ?? []},
          current_date
        )
        on conflict (puzzle_date)
            do update set
            scryfall_id = excluded.scryfall_id,
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
            returning *
        `;
    console.log("Inserted daily card:", rows[0]);
    return Response.json({
      ok: true,
      card: rows[0],
    });
  } catch (err) {
    console.error("Daily card insert failed", {
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
      cardId: card?.id ?? null,
      cardName: card?.name ?? null,
    });

    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        cardId: card?.id ?? null,
        cardName: card?.name ?? null,
      },
      { status: 500 },
    );
  }
}
