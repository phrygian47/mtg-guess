"use client";
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import type { ChainPublicRow } from "@/lib/game/chainTokens";

export default function ChainLinkPage() {
  const [puzzle, setPuzzle] = useState<ChainPublicRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startGame = async () => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const params = new URLSearchParams({ timezone });
        const res = await fetch(
          `/api/puzzles/chain-link/today?${params.toString()}`,
        );
        const data = await res.json();
        setPuzzle(data);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };
    startGame();
  }, []);

  return (
    <div className="page">
      <main className={`main ${styles.shell ?? ""}`}>
        <h1>Chain Link</h1>
        <p>Coming soon.</p>
      </main>
    </div>
  );
}
