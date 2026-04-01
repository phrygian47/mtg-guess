"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useState } from "react";

type Card = {
  id: string;
  oracle_id: string;
  name: string;
  released_at: string;
  layout: string;
  mana_cost: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors: string[];
  color_identity: string[];
  keywords: string[];
  produced_mana: string[];
  power?: string;
  toughness?: string;
  flavor_text?: string;
  legalities: {
    standard: string;
    future: string;
    historic: string;
    timeless: string;
    gladiator: string;
    pioneer: string;
    modern: string;
    legacy: string;
    pauper: string;
    vintage: string;
    penny: string;
    commander: string;
    oathbreaker: string;
    standardbrawl: string;
    brawl: string;
    alchemy: string;
    paupercommander: string;
    duel: string;
    oldschool: string;
    premodern: string;
    predh: string;
  };
  game_changer: boolean;
  rarity: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
};

export default function Home() {
  const [data, setData] = useState<Card | null>(null);

  const toCardShape = (card: Card) => {
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
  };

  const fetchCard = async () => {
    const res = await fetch("https://api.scryfall.com/cards/random");
    const data = await res.json();
    console.log(data);
    setData(toCardShape(data));
  };
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>MTG Guess</h1>
        <button onClick={fetchCard}>Fetch a Card!</button>
        <h2>Here is some info about the card:</h2>
        <p>Name: {data?.name ?? "No card loaded yet"}</p>
        <p>Released At: {data?.released_at ?? "N/A"}</p>
        <p>Layout: {data?.layout ?? "N/A"}</p>
        <p>Mana Cost: {data?.mana_cost ?? "N/A"}</p>
        <p>CMC: {data?.cmc ?? "N/A"}</p>
        <p>Type Line: {data?.type_line ?? "N/A"}</p>
        <p>Oracle Text: {data?.oracle_text ?? "N/A"}</p>
        <p>Colors: {data?.colors?.join(", ") ?? "N/A"}</p>
        <p>Color Identity: {data?.color_identity?.join(", ") ?? "N/A"}</p>
        <p>Keywords: {data?.keywords?.join(", ") ?? "N/A"}</p>
        <p>Produced Mana: {data?.produced_mana?.join(", ") ?? "N/A"}</p>
        <p>Power: {data?.power ?? "N/A"}</p>
        <p>Toughness: {data?.toughness ?? "N/A"}</p>
        <p>Flavor Text: {data?.flavor_text ?? "N/A"}</p>
      </main>
    </div>
  );
}
