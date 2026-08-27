"use client";

import { useEffect, useState } from "react";

import styles from "./YesterdayCard.module.css";

type YesterdayCardData = {
  puzzle_date: string;
  name: string;
};

type YesterdayCardProps = {
  mode: "classic" | "art";
  heading?: string;
};

export default function YesterdayCard({
  mode,
  heading = "Yesterday's card",
}: YesterdayCardProps) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [card, setCard] = useState<YesterdayCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadYesterday() {
      try {
        const params = new URLSearchParams({ timezone, mode });
        const res = await fetch(`/api/game/yesterday?${params.toString()}`);

        if (!res.ok) {
          // A 404 is normal on the mode's first day, so this stays quiet.
          throw new Error(`No card for yesterday: ${res.status}`);
        }

        const data = (await res.json()) as YesterdayCardData;

        if (!cancelled) {
          setCard(data);
        }
      } catch (error) {
        console.error("Could not load yesterday's card:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadYesterday();

    return () => {
      cancelled = true;
    };
  }, [mode, timezone]);

  // Nothing to say if there was no puzzle yesterday, so render nothing rather
  // than an empty panel.
  if (loading || !card) {
    return null;
  }

  return (
    <div className={styles.panel} aria-label={heading}>
      <span className={styles.name}>
        Yesterday&apos;s card was {card.name}
      </span>
    </div>
  );
}
