import { Card } from "./types";

export function toCardShape(card: Card): Card {
  return {
    id: card.id,
    oracle_id: card.oracle_id,
    name: card.name,
    released_at: card.released_at,
    layout: card.layout,
    mana_cost: card.mana_cost,
    cmc: card.cmc,
    type_line: card.type_line,
    oracle_text: card.oracle_text,
    colors: card.colors,
    color_identity: card.color_identity,
    keywords: card.keywords,
    produced_mana: card.produced_mana,
    power: card.power,
    toughness: card.toughness,
    flavor_text: card.flavor_text,
    legalities: card.legalities,
    game_changer: card.game_changer,
    rarity: card.rarity,
    image_uris: card.image_uris,
  };
}
