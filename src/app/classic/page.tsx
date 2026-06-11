"use client";
import styles from "./page.module.css";
import { useState, useCallback, useEffect, useRef } from "react";
import { fetchManaSymbols, ManaSymbolMap } from "@/lib/game/manaSymbols";
import { CardGuess } from "@/lib/question/types";
import InfoGrid from "@/components/UI/InfoGrid/InfoGrid";
import { submitGuess } from "@/lib/game/submitGuess";
import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import { submitCard } from "@/lib/game/submitCard";
import ClassicInfoBar from "@/components/Info/Classic-Info/Classic-Info";
import Stats from "@/components/Sections/Stats/Stats";
import ClassicLoadingScreen from "./ClassicLoadingScreen";
import {
  fetchGameStats,
  type GuessStats,
  recordGameCompletion,
} from "@/lib/game/stats";
import Image from "next/image";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import {
  loadClassicProgress,
  saveClassicProgress,
  type ClassicDisplayInfoGridRow,
  type ClassicProgressInput,
} from "@/lib/game/classicProgress";

const REVEAL_TOTAL_MS = 2000;
const VICTORY_SCROLL_OFFSET_PX = 32;
const VICTORY_SCROLL_DURATION_MS = 700;
const RESTORED_VICTORY_DELAY_MS = 1800;
const CARD_BACK_SRC = "/card_back.webp";
const MIN_LOADING_MS = 1500;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export default function ClassicPage() {
  const [infoGrid, setInfoGrid] = useState<ClassicDisplayInfoGridRow[]>([]);
  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const victoryRef = useRef<HTMLDivElement | null>(null);

  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [winningCardName, setWinningCardName] = useState<string | null>(null);
  const [winningCardImage, setWinningCardImage] = useState<string | null>(null);
  const [winningOracleId, setWinningOracleId] = useState<string | null>(null);
  const [completionRecorded, setCompletionRecorded] = useState(false);
  const [shouldRetryCompletionRecord, setShouldRetryCompletionRecord] =
    useState(false);
  const [dailyStats, setDailyStats] = useState<GuessStats | null>(null);
  const [victoryStats, setVictoryStats] = useState<GuessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [dailyStatsReady, setDailyStatsReady] = useState(false);
  const [classicProgressReady, setClassicProgressReady] = useState(false);
  const [cardBackReady, setCardBackReady] = useState(false);
  const [minimumLoadingTimePassed, setMinimumLoadingTimePassed] =
    useState(false);
  const [manaSymbolsBySymbol, setManaSymbolsBySymbol] = useState<ManaSymbolMap>(
    {},
  );
  const countdown = useNextPuzzleCountdown();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const showLoadingScreen =
    !dailyStatsReady ||
    !classicProgressReady ||
    !cardBackReady ||
    !minimumLoadingTimePassed;

  const persistProgress = useCallback(
    (progress: ClassicProgressInput) => saveClassicProgress(timezone, progress),
    [timezone],
  );

  const hasRequestedWakeRef = useRef(false);

  const wakeDatabase = useCallback((delayMs = 500) => {
    if (hasRequestedWakeRef.current) return;
    hasRequestedWakeRef.current = true;

    window.setTimeout(() => {
      fetch("/api/cards/wake", {
        method: "GET",
        cache: "no-store",
      }).catch(() => {});
    }, delayMs);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumLoadingTimePassed(true);
    }, MIN_LOADING_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showVictory) return;

    let frameId: number | null = null;

    const startScroll = () => {
      const element = victoryRef.current;
      if (!element) return;

      const startY = window.scrollY;
      const targetY = Math.max(
        0,
        startY + element.getBoundingClientRect().top - VICTORY_SCROLL_OFFSET_PX,
      );
      const distance = targetY - startY;
      const startedAt = window.performance.now();

      const step = (timestamp: number) => {
        const elapsed = timestamp - startedAt;
        const progress = Math.min(elapsed / VICTORY_SCROLL_DURATION_MS, 1);
        const nextY = startY + distance * easeOutCubic(progress);

        window.scrollTo(0, nextY);

        if (progress < 1) {
          frameId = window.requestAnimationFrame(step);
        }
      };

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(startScroll);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [showVictory]);

  useEffect(() => {
    let victoryTimer: number | null = null;

    const restoreTimer = window.setTimeout(() => {
      const savedProgress = loadClassicProgress(timezone);

      if (!savedProgress) {
        setClassicProgressReady(true);
        return;
      }

      setInfoGrid(savedProgress.rows);
      setVictoryStats(savedProgress.stats);
      setCompletionRecorded(savedProgress.completionRecorded);

      if (savedProgress.completed) {
        setGameWon(true);
        setWinningCardName(savedProgress.winningCardName);
        setWinningCardImage(savedProgress.winningCardImage);
        setWinningOracleId(savedProgress.winningOracleId);
        setShouldRetryCompletionRecord(!savedProgress.completionRecorded);

        victoryTimer = window.setTimeout(() => {
          setShowVictory(true);
        }, RESTORED_VICTORY_DELAY_MS);
      }

      setClassicProgressReady(true);
    }, 0);

    return () => {
      window.clearTimeout(restoreTimer);

      if (victoryTimer !== null) {
        window.clearTimeout(victoryTimer);
      }
    };
  }, [timezone]);

  useEffect(() => {
    let cancelled = false;

    async function loadCardBack() {
      await preloadBrowserImage(CARD_BACK_SRC);

      if (!cancelled) {
        setCardBackReady(true);
      }
    }

    loadCardBack();
    wakeDatabase();

    return () => {
      cancelled = true;
    };
  }, [wakeDatabase]);

  useEffect(() => {
    if (
      !shouldRetryCompletionRecord ||
      !gameWon ||
      completionRecorded ||
      !winningOracleId ||
      infoGrid.length === 0
    ) {
      return;
    }

    let cancelled = false;
    const recordingOracleId = winningOracleId;

    async function retryCompletionRecord() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const stats = await recordGameCompletion(
          timezone,
          recordingOracleId,
          infoGrid.length,
        );

        if (cancelled) return;

        setCompletionRecorded(true);
        setVictoryStats(stats);
        setDailyStats(stats);
        persistProgress({
          rows: infoGrid,
          completed: true,
          winningCardName,
          winningCardImage,
          winningOracleId: recordingOracleId,
          completionRecorded: true,
          stats,
        });
      } catch (error) {
        console.error("Could not record restored game stats:", error);

        if (!cancelled) {
          setStatsError("Stats are unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
          setShouldRetryCompletionRecord(false);
        }
      }
    }

    retryCompletionRecord();

    return () => {
      cancelled = true;
    };
  }, [
    completionRecorded,
    gameWon,
    infoGrid,
    persistProgress,
    shouldRetryCompletionRecord,
    timezone,
    winningCardImage,
    winningCardName,
    winningOracleId,
  ]);

  const handleSubmitGuess = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard || gameWon) return;

    try {
      const guessedCardId = selectedGuessCard;
      const guessesUsed = infoGrid.length + 1;
      const result = await submitGuess(timezone, guessedCardId);
      const newInfoGridRow = await submitCard(timezone, guessedCardId);
      const nextInfoGrid = [
        {
          id: crypto.randomUUID(),
          row: newInfoGridRow,
        },
        ...infoGrid,
      ];

      setInfoGrid(nextInfoGrid);
      setSelectedGuessCard("");
      setSearchClearSignal((value) => value + 1);

      if (!result.answer) {
        persistProgress({
          rows: nextInfoGrid,
          completed: false,
          winningCardName: null,
          winningCardImage: null,
          winningOracleId: null,
          completionRecorded: false,
          stats: null,
        });

        return;
      }

      setGameWon(true);
      setWinningCardName(result.name);
      setWinningCardImage(result.image_normal);
      setWinningOracleId(guessedCardId);
      setCompletionRecorded(false);
      setShouldRetryCompletionRecord(false);
      setVictoryStats(null);
      setStatsError(null);
      setStatsLoading(true);
      persistProgress({
        rows: nextInfoGrid,
        completed: true,
        winningCardName: result.name,
        winningCardImage: result.image_normal,
        winningOracleId: guessedCardId,
        completionRecorded: false,
        stats: null,
      });

      window.setTimeout(() => {
        setShowVictory(true);
      }, REVEAL_TOTAL_MS);

      try {
        const stats = await recordGameCompletion(
          timezone,
          guessedCardId,
          guessesUsed,
        );

        setCompletionRecorded(true);
        setVictoryStats(stats);
        setDailyStats(stats);
        persistProgress({
          rows: nextInfoGrid,
          completed: true,
          winningCardName: result.name,
          winningCardImage: result.image_normal,
          winningOracleId: guessedCardId,
          completionRecorded: true,
          stats,
        });
      } catch (error) {
        console.error("Could not record game stats:", error);
        setStatsError("Stats are unavailable right now.");
      } finally {
        setStatsLoading(false);
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

          if (gameWon) {
            setVictoryStats(stats);
          }
        }
      } catch (error) {
        console.error("Could not load game stats:", error);
      } finally {
        if (!cancelled) {
          setDailyStatsReady(true);
        }
      }
    }

    loadDailyStats();

    return () => {
      cancelled = true;
    };
  }, [gameWon, timezone]);

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

  if (showLoadingScreen) {
    return <ClassicLoadingScreen cardBackSrc={CARD_BACK_SRC} />;
  }

  return (
    <div className="page">
      <main className="main">
        <div>
          <div className={styles.title}>
            <ClassicInfoBar />
          </div>
          <div className={styles.heading}>
            <h1 className={styles.title}>
              Guess today&apos;s Magic: The Gathering card!
            </h1>
            {infoGrid.length === 0 && !showVictory && (
              <div>
                <h2>Start typing to submit a guess...</h2>
              </div>
            )}
          </div>

          <div>
            {!showVictory && (
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
                  onSelect={(card) =>
                    setSelectedGuessCard(card?.oracle_id ?? "")
                  }
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
            )}
            {!showVictory && (
              <p className={styles.solvedCount} aria-live="polite">
                {dailyStats
                  ? `${dailyStats.solvedCount} ${
                      dailyStats.solvedCount === 1
                        ? "player has"
                        : "players have"
                    } solved today`
                  : "Solve count unavailable"}
              </p>
            )}
          </div>
        </div>
        <div>
          <InfoGrid rows={infoGrid} manaSymbolsBySymbol={manaSymbolsBySymbol} />

          {showVictory && (
            <section ref={victoryRef} className={styles.victorySection}>
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
                <section className={styles.statsPanel}>
                  <Stats
                    guesses={infoGrid.length}
                    stats={victoryStats}
                    statsLoading={statsLoading}
                    statsError={statsError}
                  />
                </section>
                <div className={styles.timer}>
                  <span className={styles.timer_text}>Next card in: </span>
                  <span className={styles.timer_clock}>
                    {formatCountdown(countdown)}
                  </span>
                  <span>
                    <em>New card every local midnight</em>
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

async function preloadBrowserImage(src: string) {
  if (typeof window === "undefined") {
    return;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.src = src;

  try {
    if (image.decode) {
      await image.decode();
      return;
    }

    await new Promise<void>((resolve) => {
      image.onload = () => resolve();
      image.onerror = () => resolve();
    });
  } catch {
    // Let the page continue even if the browser cannot decode the preload.
  }
}
