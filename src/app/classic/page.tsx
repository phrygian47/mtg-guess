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
import {
  fetchGameStats,
  GuessStats,
  recordGameCompletion,
} from "@/lib/game/stats";
import Image from "next/image";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

const REVEAL_TOTAL_MS = 3000;

function formatGuessLabel(guesses: number) {
  return guesses === 1 ? "1 guess" : `${guesses} guesses`;
}

export default function ClassicPage() {
  const [infoGrid, setInfoGrid] = useState<DisplayInfoGridRow[]>([]);
  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);

  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [winningCardName, setWinningCardName] = useState<string | null>(null);
  const [winningCardImage, setWinningCardImage] = useState<string | null>(null);
  const [dailyStats, setDailyStats] = useState<GuessStats | null>(null);
  const [victoryStats, setVictoryStats] = useState<GuessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [manaSymbolsBySymbol, setManaSymbolsBySymbol] = useState<ManaSymbolMap>(
    {},
  );

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSubmitGuess = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard || gameWon) return;

    try {
      const guessedCardId = selectedGuessCard;
      const guessesUsed = infoGrid.length + 1;
      const result = await submitGuess(timezone, guessedCardId);
      const newInfoGridRow = await submitCard(timezone, guessedCardId);

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
        setVictoryStats(null);
        setStatsError(null);
        setStatsLoading(true);

        window.setTimeout(() => {
          setShowVictory(true);
        }, REVEAL_TOTAL_MS);

        try {
          const stats = await recordGameCompletion(
            timezone,
            guessedCardId,
            guessesUsed,
          );

          setVictoryStats(stats);
          setDailyStats(stats);
        } catch (error) {
          console.error("Could not record game stats:", error);
          setStatsError("Stats are unavailable right now.");
        } finally {
          setStatsLoading(false);
        }
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

    async function loadDailyStats() {
      try {
        const stats = await fetchGameStats(timezone);

        if (!cancelled) {
          setDailyStats(stats);
        }
      } catch (error) {
        console.error("Could not load game stats:", error);
      }
    }

    loadDailyStats();

    return () => {
      cancelled = true;
    };
  }, [timezone]);

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

            <p className={styles.solvedCount} aria-live="polite">
              {dailyStats
                ? `${dailyStats.solvedCount} ${
                    dailyStats.solvedCount === 1 ? "player has" : "players have"
                  } solved today`
                : "Loading solve count..."}
            </p>
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

              <div className={styles.victoryContent}>
                {winningCardImage && (
                  <Image
                    src={winningCardImage}
                    alt={winningCardName ?? "Winning card"}
                    className={styles.victoryCard}
                    width={488}
                    height={680}
                  />
                )}

                <section className={styles.statsPanel} aria-live="polite">
                  <div className={styles.statsHeader}>
                    <h3>Today&apos;s Results</h3>
                    <span>{formatGuessLabel(infoGrid.length)}</span>
                  </div>

                  {statsLoading && (
                    <p className={styles.statsMessage}>Loading results...</p>
                  )}

                  {statsError && (
                    <p className={styles.statsMessage}>{statsError}</p>
                  )}

                  {victoryStats && (
                    <>
                      <div className={styles.statsSummary}>
                        <div>
                          <span className={styles.statValue}>
                            {victoryStats.solvedCount}
                          </span>
                          <span className={styles.statLabel}>
                            players solved
                          </span>
                        </div>
                        <div>
                          <span className={styles.statValue}>
                            {victoryStats.averageGuesses?.toFixed(1) ?? "—"}
                          </span>
                          <span className={styles.statLabel}>avg guesses</span>
                        </div>
                      </div>

                      <div className={styles.distribution}>
                        {victoryStats.distribution.map((bucket) => (
                          <div className={styles.statRow} key={bucket.guesses}>
                            <span className={styles.guessCount}>
                              {bucket.guesses}
                            </span>
                            <div
                              className={styles.barTrack}
                              role="meter"
                              aria-label={`${bucket.players} players solved in ${formatGuessLabel(
                                bucket.guesses,
                              )}`}
                              aria-valuemin={0}
                              aria-valuemax={Math.max(
                                victoryStats.solvedCount,
                                1,
                              )}
                              aria-valuenow={bucket.players}
                            >
                              <span
                                className={styles.barFill}
                                style={
                                  {
                                    "--bar-width": `${Math.max(
                                      bucket.barWidth,
                                      4,
                                    )}%`,
                                  } as React.CSSProperties
                                }
                              />
                            </div>
                            <span className={styles.playerCount}>
                              {bucket.players}
                              <small>{bucket.share}%</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
