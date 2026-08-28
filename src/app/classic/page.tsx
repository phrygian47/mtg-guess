"use client";
import styles from "./page.module.css";
import { useState, useCallback, useEffect } from "react";
import { fetchManaSymbols, ManaSymbolMap } from "@/lib/game/manaSymbols";
import { Share } from "lucide-react";
import { CardGuess } from "@/lib/question/types";
import InfoGrid from "@/components/UI/InfoGrid/InfoGrid";
import { submitGuess } from "@/lib/game/submitGuess";
import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import { submitCard } from "@/lib/game/submitCard";
import ClassicInfoBar from "@/components/Info/Classic-Info/Classic-Info";
import Stats from "@/components/Sections/Stats/Stats";
import YesterdayCard from "@/components/Sections/Yesterday/YesterdayCard";
import ClassicLoadingScreen from "./ClassicLoadingScreen";
import { loadCardSearchIndex } from "@/lib/db/loadCardSearchIndex";
import { GenerateShareString } from "@/lib/game/share";
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
import { useVictoryScroll } from "@/lib/game/useVictoryScroll";

const REVEAL_TOTAL_MS = 2000;
const RESTORED_VICTORY_DELAY_MS = 1800;
const CARD_BACK_SRC = "/card_back.webp";
const MIN_LOADING_MS = 10000;

type AnimatedInfoGridRow = {
  id: string;
  row: ClassicDisplayInfoGridRow["row"] | null;
  submittedAt?: number;
  pending?: boolean;
};

function rankSearchResult(name: string, query: string) {
  const normalizedName = name.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;
  if (normalizedName.includes(` ${normalizedQuery}`)) return 2;
  return 3;
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

export default function ClassicPage() {
  const [infoGrid, setInfoGrid] = useState<AnimatedInfoGridRow[]>([]);
  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const [searchClearSignal, setSearchClearSignal] = useState(0);

  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const victoryRef = useVictoryScroll<HTMLDivElement>(showVictory);
  const [winningCardName, setWinningCardName] = useState<string | null>(null);
  const [winningCardImage, setWinningCardImage] = useState<string | null>(null);
  const [winningOracleId, setWinningOracleId] = useState<string | null>(null);
  const [completionRecorded, setCompletionRecorded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shouldRetryCompletionRecord, setShouldRetryCompletionRecord] =
    useState(false);
  const [dailyStats, setDailyStats] = useState<GuessStats | null>(null);
  const [victoryStats, setVictoryStats] = useState<GuessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [dailyStatsReady, setDailyStatsReady] = useState(false);
  const [classicProgressReady, setClassicProgressReady] = useState(false);
  const [cardBackReady, setCardBackReady] = useState(false);
  const [shareGrid, setShareGrid] = useState<string>("");
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

  const getCompletedRows = useCallback((rows: AnimatedInfoGridRow[]) => {
    return rows.filter(
      (row): row is ClassicDisplayInfoGridRow => row.row !== null,
    );
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(shareGrid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumLoadingTimePassed(true);
    }, MIN_LOADING_MS);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let victoryTimer: number | null = null;

    const restoreTimer = window.setTimeout(() => {
      const savedProgress = loadClassicProgress(timezone);

      if (!savedProgress) {
        setClassicProgressReady(true);
        return;
      }

      setInfoGrid(
        savedProgress.rows.map((row) => ({
          ...row,
          submittedAt: 0,
          pending: false,
        })),
      );
      setVictoryStats(savedProgress.stats);
      setCompletionRecorded(savedProgress.completionRecorded);
      console.log(savedProgress.rows);
      const today = new Date();
      const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
      setShareGrid(
        `MTGdle Classic: ${dateStr}\nSolved in ${savedProgress.rows.length} guesses\nPlay at https://mtgdle.net${GenerateShareString(savedProgress.rows)}`,
      );

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
    loadCardSearchIndex().catch((error) => {
      console.error("Could not preload card search index:", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !shouldRetryCompletionRecord ||
      !gameWon ||
      completionRecorded ||
      !winningOracleId ||
      getCompletedRows(infoGrid).length === 0
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
          rows: getCompletedRows(infoGrid),
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
    getCompletedRows,
  ]);

  const handleSubmitGuess = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard || gameWon) return;

    const guessedCardId = selectedGuessCard;
    const guessesUsed = getCompletedRows(infoGrid).length + 1;
    const pendingRowId = crypto.randomUUID();

    const pendingRow: AnimatedInfoGridRow = {
      id: pendingRowId,
      row: null,
      pending: true,
      submittedAt: window.performance.now(),
    };

    setInfoGrid((prev) => [pendingRow, ...prev]);
    setSelectedGuessCard("");
    setSearchClearSignal((value) => value + 1);

    try {
      const [result, newInfoGridRow] = await Promise.all([
        submitGuess(timezone, guessedCardId),
        submitCard(timezone, guessedCardId),
      ]);

      const nextInfoGrid: AnimatedInfoGridRow[] = [
        {
          id: pendingRowId,
          row: newInfoGridRow,
          pending: false,
          submittedAt: pendingRow.submittedAt,
        },
        ...infoGrid,
      ];

      setInfoGrid(nextInfoGrid);

      const completedRows = getCompletedRows(nextInfoGrid);

      if (!result.answer) {
        persistProgress({
          rows: completedRows,
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
        rows: completedRows,
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
        const today = new Date();
        const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
        setShareGrid(
          `MTGdle Classic ${dateStr}\nSolved in ${guessesUsed} guesses\nPlay at https://mtgdle.net${GenerateShareString(completedRows)}`,
        );

        persistProgress({
          rows: completedRows,
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

      setInfoGrid((prev) => prev.filter((row) => row.id !== pendingRowId));
    }
  };

  const fetchCardOptions = useCallback(
    async (query: string): Promise<CardGuess[]> => {
      const searchIndex = await loadCardSearchIndex();

      return searchIndex
        .search(query)
        .sort((a, b) => {
          const rankDiff =
            rankSearchResult(String(a.name), query) -
            rankSearchResult(String(b.name), query);

          if (rankDiff !== 0) return rankDiff;

          return b.score - a.score;
        })
        .slice(0, 20)
        .map((result) => ({
          id: String(result.id),
          oracle_id: String(result.id),
          name: String(result.name),
        }));
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
    return <ClassicLoadingScreen />;
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
            {}
          </div>
        </div>
        <div>
          <InfoGrid rows={infoGrid} manaSymbolsBySymbol={manaSymbolsBySymbol} />

          {infoGrid.length > 0 && (
            <div className={styles.indicator_container}>
              <p className={styles.indicator_heading}>Color Indicators</p>

              <ul className={styles.indicator_list}>
                <li className={styles.indicator}>
                  <span
                    className={`${styles.indicator_swatch} ${styles.indicator_correct}`}
                    aria-hidden="true"
                  />
                  <span className={styles.indicator_label}>Correct</span>
                </li>

                <li className={styles.indicator}>
                  <span
                    className={`${styles.indicator_swatch} ${styles.indicator_partial}`}
                    aria-hidden="true"
                  />
                  <span className={styles.indicator_label}>Close</span>
                </li>

                <li className={styles.indicator}>
                  <span
                    className={`${styles.indicator_swatch} ${styles.indicator_wrong}`}
                    aria-hidden="true"
                  />
                  <span className={styles.indicator_label}>Incorrect</span>
                </li>

                <li className={styles.indicator}>
                  <span
                    className={`${styles.indicator_swatch} ${styles.indicator_arrow}`}
                    aria-hidden="true"
                  >
                    <Image
                      src="/icons/chevrons-up.svg"
                      alt=""
                      width={20}
                      height={20}
                    />
                  </span>
                  <span className={styles.indicator_label}>Higher</span>
                </li>

                <li className={styles.indicator}>
                  <span
                    className={`${styles.indicator_swatch} ${styles.indicator_arrow}`}
                    aria-hidden="true"
                  >
                    <Image
                      src="/icons/chevrons-down.svg"
                      alt=""
                      width={20}
                      height={20}
                    />
                  </span>
                  <span className={styles.indicator_label}>Lower</span>
                </li>
              </ul>
            </div>
          )}

          <div className={styles.yesterday}>
            <YesterdayCard mode="classic" />
          </div>

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
                    guesses={getCompletedRows(infoGrid).length}
                    stats={victoryStats}
                    statsLoading={statsLoading}
                    statsError={statsError}
                  />
                </section>
                {shareGrid && (
                  <div className={styles.shareGrid}>
                    <p>{shareGrid}</p>
                    <button onClick={handleShare}>
                      <Share size={20} /> {copied ? "Copied!" : "Share Results"}
                    </button>
                  </div>
                )}
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
