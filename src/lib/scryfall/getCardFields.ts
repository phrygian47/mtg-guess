import { Card } from "@/lib/scryfall/types";

export function getLoyalty(card: Card): string | null {
  if (card.loyalty != null) {
    return card.loyalty;
  }

  const planeswalkerFace = card.card_faces?.find((face) =>
    face.type_line?.includes("Planeswalker"),
  );

  return planeswalkerFace?.loyalty ?? null;
}
