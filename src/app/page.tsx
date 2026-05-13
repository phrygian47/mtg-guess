"use client";
import type { Card } from "@/lib/scryfall/types";
import styles from "./page.module.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { CardGuess } from "@/lib/question/types";
import { InfoGridRow } from "@/lib/game/types";
import InfoGrid from "@/components/UI/InfoGrid/InfoGrid";
import { submitGuess } from "@/lib/game/submitGuess";
import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import { submitCard } from "@/lib/game/submitCard";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

export default function Home() {
  const [card, setCard] = useState<Card | null>(null);
  const [guessesRemaining, setGuessesRemaining] = useState(21);
  const [loading, setLoading] = useState(true);
  const [cardVisible, setCardVisible] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [infoGrid, setInfoGrid] = useState<DisplayInfoGridRow[]>([]);

  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const guessInputRef = useRef<HTMLInputElement>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSubmitGuess = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard) return;

    try {
      const isCorrect = await submitGuess(timezone, selectedGuessCard);
      const newInfoGridRow = await submitCard(timezone, selectedGuessCard);

      setInfoGrid((prev) => [
        {
          id: crypto.randomUUID(),
          row: newInfoGridRow,
        },
        ...prev,
      ]);

      setGameWon(isCorrect);
      setGuessesRemaining((prev) => prev - 1);
      setSelectedGuessCard("");
    } catch (error) {
      console.error("Could not submit guess:", error);
    }
  };

  const fetchCardOptions = useCallback(
    async (query: string): Promise<CardGuess[]> => {
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(query)}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch card options");
      }

      const cards: CardGuess[] = await res.json();
      return cards;
    },
    [],
  );

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch(
          `/api/fetch-card?timezone=${encodeURIComponent(timezone)}`,
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch card ${res.status} ${text}`);
        }

        const card: Card = await res.json();
        setCard(card);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, []);

  if (gameWon && card) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.victoryScreen}>
            <h1 className={styles.title}>You got it!</h1>

            <p className={styles.victoryText}>
              The card was <strong>{card.name}</strong>.
            </p>

            {card.image_uris?.normal && (
              <img
                src={card.image_uris.normal}
                alt={card.name}
                className={styles.victoryCard}
              />
            )}

            <p>
              You solved it with {guessesRemaining} question
              {guessesRemaining === 1 ? "" : "s"} remaining.
            </p>

            <button
              className={styles.button}
              onClick={() => window.location.reload()}
            >
              Play Again
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Guess the Card!</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            <button onClick={() => setCardVisible(!cardVisible)}>
              Toggle Reveal (Testing purposes only)
            </button>
          </div>
        )}
        {cardVisible && <p>{card?.name}</p>}

        <div>
          <h3>You have {guessesRemaining} questions left!</h3>
        </div>

        <div>
          {infoGrid.length === 0 && (
            <div>
              <h3>Card is a non promo standard legal card.</h3>
              <p>Start typing to submit a guess</p>
            </div>
          )}

          <form
            id="guess-form"
            className={styles.form}
            onSubmit={handleSubmitGuess}
            autoComplete="off"
          >
            <CustomSearchable
              id="guess-search"
              ref={guessInputRef}
              fetchOptions={fetchCardOptions}
              displayValue={(card) => card.name}
              renderOption={(card) => <div>{card.name}</div>}
              placeholder="Search for a card..."
              minQueryLength={2}
              onSelect={(card) => setSelectedGuessCard(card.oracle_id)}
            />

            <button
              type="submit"
              className={styles.button}
              disabled={guessesRemaining <= 0}
            >
              Guess
            </button>
          </form>

          <InfoGrid rows={infoGrid} />
        </div>
      </main>
    </div>
  );
}
