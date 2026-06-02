"use client";
import styles from "./page.module.css";
import { useState, useCallback, useEffect } from "react";
import { fetchManaSymbols, ManaSymbolMap } from "@/lib/game/manaSymbols";
import { CardGuess } from "@/lib/question/types";
import { InfoGridRow } from "@/lib/game/types";
import InfoGrid from "@/components/UI/InfoGrid/InfoGrid";
import { submitGuess } from "@/lib/game/submitGuess";
import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import { submitCard } from "@/lib/game/submitCard";
import ClassicInfoBar from "@/components/Info/Classic-Info/Classic-Info";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

const REVEAL_TOTAL_MS = 1300;

export default function ClassicPage() {
  const [infoGrid, setInfoGrid] = useState<DisplayInfoGridRow[]>([]);
  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);

  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [winningCardName, setWinningCardName] = useState<string | null>(null);
  const [winningCardImage, setWinningCardImage] = useState<string | null>(null);
  const [manaSymbolsBySymbol, setManaSymbolsBySymbol] = useState<ManaSymbolMap>(
    {},
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSubmitGuess = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard || gameWon) return;

    try {
      const result = await submitGuess(timezone, selectedGuessCard);
      const newInfoGridRow = await submitCard(timezone, selectedGuessCard);

      setInfoGrid((prev) => [
        {
          id: crypto.randomUUID(),
          row: newInfoGridRow,
        },
        ...prev,
      ]);

      setSelectedGuessCard("");
      setSearchClearSignal((value) => value + 1);

      if (result.answer) {
        setGameWon(true);
        setWinningCardName(result.name);
        setWinningCardImage(result.image_normal);

        window.setTimeout(() => {
          setShowVictory(true);
        }, REVEAL_TOTAL_MS);
      }
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

      return res.json();
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadManaSymbols() {
      try {
        const symbols = await fetchManaSymbols();

        if (!cancelled) {
          setManaSymbolsBySymbol(symbols);
        }
      } catch (error) {
        console.error("Could not load mana symbols:", error);
      }
    }

    loadManaSymbols();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <main className="main">
        <div className={styles.title}>
          <h1 className={styles.title}>Guess the Card!</h1>
          <ClassicInfoBar />
          {infoGrid.length === 0 && !showVictory && (
            <div>
              <h3>Start typing to submit a guess</h3>
            </div>
          )}
          <div>
            <form
              id="guess-form"
              className={styles.search_menu}
              onSubmit={handleSubmitGuess}
              autoComplete="off"
            >
              <CustomSearchable
                id="guess-search"
                fetchOptions={fetchCardOptions}
                displayValue={(card) => card.name}
                renderOption={(card) => <div>{card.name}</div>}
                placeholder="Search for a card..."
                minQueryLength={2}
                onSelect={(card) => setSelectedGuessCard(card.oracle_id)}
                clearSignal={searchClearSignal}
              />

              {/* <button
                type="submit"
                className={styles.button}
                disabled={gameWon}
              >
                Submit
              </button> */}
            </form>
          </div>
        </div>
        <div>
          <InfoGrid rows={infoGrid} manaSymbolsBySymbol={manaSymbolsBySymbol} />

          {showVictory && (
            <section className={styles.victorySection}>
              <h2 className={styles.victoryTitle}>You got it!</h2>
              <p className={styles.victoryText}>
                The card was <strong>{winningCardName}</strong>.
              </p>

              {winningCardImage && (
                <img
                  src={winningCardImage}
                  alt={winningCardName ?? "Winning card"}
                  className={styles.victoryCard}
                />
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
