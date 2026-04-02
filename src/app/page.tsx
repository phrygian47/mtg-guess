"use client";
import type { Card } from "@/lib/scryfall/types";
import styles from "./page.module.css";
import { useState } from "react";

export default function Home() {
  const [data, setData] = useState<Card | null>(null);

  const fetchCard = async () => {
    const res = await fetch("/api/fetch-card");
    const card: Card = await res.json();
    setData(card);
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
