"use client";
import SaltInfoBar from "@/components/Info/Salt-Info/Salt-Info";
import Stats from "@/components/Sections/Stats/Stats";
import ManaSpinner from "@/components/UI/ManaSpinner/ManaSpinner";
import styles from "./page.module.css";
import { useCallback, useState, useEffect } from "react";
import { Share } from "lucide-react";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import {
  fetchGameStats,
  recordGameCompletion,
  type GuessStats,
} from "@/lib/game/stats";
import Image from "next/image";
import {
  formatSaltScore,
  loadSaltScoreProgress,
  saveSaltScoreProgress,
  SALT_SCORE_ORACLE_ID,
  SALT_SCORE_ROUND_COUNT,
  type SaltScoreProgressInput,
} from "@/lib/game/saltScoreProgress";

type gameState = "loading" | "playing" | "finished";

type Item = {
  oracle_id: string;
  name: string;
  image_normal: string;
};

type ItemPair = {
  pair_number: number;
  left: Item;
  right: Item;
};

type ItemPairList = [ItemPair, ItemPair, ItemPair, ItemPair, ItemPair];

type RevealedScores = {
  pairs: {
    pair_number: number;
    left: { oracle_id: string; salt_score: number };
    right: { oracle_id: string; salt_score: number };
  }[];
};

// Simple CountUp component for animating the salt score
function CountUp({
  end,
  duration = 1000,
  start = false,
}: {
  end: number;
  duration?: number;
  start?: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Only run animation when start is true
    if (!start) {
      setCount(0);
      return;
    }

    let animationFrameId: number;
    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Smooth ease-out cubic curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(easeOut * end);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [end, duration, start]);

  return <span>{count.toFixed(2)}</span>;
}

const LAST_ROUND_INDEX = SALT_SCORE_ROUND_COUNT - 1;
const MIN_LOADING_MS = 100;

export default function Page() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [currentRound, setCurrentRound] = useState(0);
  const [gameState, setGameState] = useState<gameState>("loading");
  const [itemPairList, setItemPairList] = useState<ItemPairList | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [isLoadingScores, setIsLoadingScores] = useState<boolean>(false);

  // Track array of booleans instead of numeric score for share string
  const [results, setResults] = useState<boolean[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [revealedScores, setRevealedScores] = useState<RevealedScores | null>(
    null,
  );
  const [selectedSide, setSelectedSide] = useState<"left" | "right" | null>(
    null,
  );

  const countdown = useNextPuzzleCountdown();
  const [copied, setCopied] = useState(false);

  const [minimumLoadingTimePassed, setMinimumLoadingTimePassed] =
    useState(false);
  const [completionRecorded, setCompletionRecorded] = useState(false);
  const [shouldRefreshStats, setShouldRefreshStats] = useState(false);
  const [stats, setStats] = useState<GuessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  const persistProgress = useCallback(
    (input: SaltScoreProgressInput) => saveSaltScoreProgress(timezone, input),
    [timezone],
  );

  // Mirrors the guard in handleGuess: once a card is no longer a live choice it
  // should not react to the pointer either.
  const cardLockClass = revealed || isLoadingScores ? styles.locked : "";

  const getCardStatusClass = (side: "left" | "right") => {
    if (!revealed || !currentScores) return "";

    const leftVal = currentScores.left.salt_score;
    const rightVal = currentScores.right.salt_score;

    if (side === "left") {
      return leftVal >= rightVal ? styles.winner : styles.loser;
    } else {
      return rightVal >= leftVal ? styles.winner : styles.loser;
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMinimumLoadingTimePassed(true);
    }, MIN_LOADING_MS);

    return () => window.clearTimeout(timer);
  }, []);

  // Restore today's saved progress before the puzzle finishes loading so a
  // refresh drops the player back into the round they left off on.
  useEffect(() => {
    const savedProgress = loadSaltScoreProgress(timezone);

    if (!savedProgress) return;

    setResults(savedProgress.results);
    setCurrentRound(savedProgress.currentRound);
    setCompletionRecorded(savedProgress.completionRecorded);
    setStats(savedProgress.stats);

    if (savedProgress.completed) {
      setGameState("finished");
      // Cached stats are a snapshot from whenever this game was finished, so
      // pull the current numbers if the completion is already on the server.
      setShouldRefreshStats(savedProgress.completionRecorded);
    }
  }, [timezone]);

  useEffect(() => {
    const params = new URLSearchParams({ timezone });

    const fetchItems = async () => {
      try {
        const response = await fetch(
          `/api/salt-score/start-game?${params.toString()}`,
        );
        const data = await response.json();
        setItemPairList(data.pairs);
        setGameState((current) =>
          current === "finished" ? current : "playing",
        );
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, [timezone]);

  // Records the completion once per day, covering both a game finished in this
  // session and one restored from storage that never reached the server.
  useEffect(() => {
    if (
      gameState !== "finished" ||
      completionRecorded ||
      results.length < SALT_SCORE_ROUND_COUNT
    ) {
      return;
    }

    let cancelled = false;

    async function recordCompletion() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const latestStats = await recordGameCompletion(
          timezone,
          SALT_SCORE_ORACLE_ID,
          results.filter(Boolean).length,
          "salt-score",
        );

        if (cancelled) return;

        setCompletionRecorded(true);
        setStats(latestStats);
        persistProgress({
          results,
          currentRound,
          completed: true,
          completionRecorded: true,
          stats: latestStats,
        });
      } catch (recordError) {
        console.error("Could not record salt score stats:", recordError);

        if (!cancelled) {
          setStatsError("Stats are unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    }

    recordCompletion();

    return () => {
      cancelled = true;
    };
  }, [
    completionRecorded,
    currentRound,
    gameState,
    persistProgress,
    results,
    timezone,
  ]);

  // Picks up completions other players recorded after this game was finished.
  // Runs only for a restored game; a completion recorded in this session
  // already got current numbers back from the POST.
  useEffect(() => {
    if (!shouldRefreshStats) return;

    let cancelled = false;
    const hasCachedStats = stats !== null;

    async function refreshStats() {
      if (!hasCachedStats) {
        setStatsLoading(true);
      }

      try {
        const latestStats = await fetchGameStats(timezone, "salt-score");

        if (cancelled) return;

        setStats(latestStats);
        persistProgress({
          results,
          currentRound,
          completed: true,
          completionRecorded: true,
          stats: latestStats,
        });
      } catch (refreshError) {
        // Keep showing the cached distribution rather than an error.
        console.error("Could not refresh salt score stats:", refreshError);
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
          setShouldRefreshStats(false);
        }
      }
    }

    refreshStats();

    return () => {
      cancelled = true;
    };
  }, [
    currentRound,
    persistProgress,
    results,
    shouldRefreshStats,
    stats,
    timezone,
  ]);

  const handleGuess = async (side: "left" | "right") => {
    if (revealed || isLoadingScores) return;
    setIsLoadingScores(true);
    setSelectedSide(side);

    try {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({ timezone: userTimezone });
      const response = await fetch(
        `/api/salt-score/reveal?${params.toString()}`,
      );

      if (response.ok) {
        const data: RevealedScores = await response.json();

        setRevealedScores(data);
        setRevealed(true);
        setIsLoadingScores(false);

        const currentPair = itemPairList?.[currentRound];
        const currentScores = data.pairs.find(
          (p) => p.pair_number === currentPair?.pair_number,
        );
        if (currentScores) {
          const leftVal = currentScores.left.salt_score;
          const rightVal = currentScores.right.salt_score;

          const isCorrect =
            (side === "left" && leftVal >= rightVal) ||
            (side === "right" && rightVal >= leftVal);

          setIsCorrect(isCorrect);
        }
      } else {
        setIsLoadingScores(false);
      }
    } catch (err) {
      console.error("Failed to reveal scores", err);
      setIsLoadingScores(false);
    }
  };

  const handleNextRound = () => {
    // Save result of the round
    const nextResults = [...results, isCorrect];
    setResults(nextResults);

    if (currentRound < LAST_ROUND_INDEX) {
      const nextRound = currentRound + 1;

      setCurrentRound(nextRound);
      setRevealed(false);
      setSelectedSide(null);
      persistProgress({
        results: nextResults,
        currentRound: nextRound,
        completed: false,
        completionRecorded: false,
        stats: null,
      });
    } else {
      setGameState("finished");
      persistProgress({
        results: nextResults,
        currentRound,
        completed: true,
        completionRecorded: false,
        stats: null,
      });
    }
  };

  const getShareString = () => {
    const totalScore = results.filter((r) => r).length;
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    const sequence = results.map((r) => (r ? "🟩" : "🟥")).join("");
    return `MTGdle: Salt Score ${dateStr} - ${totalScore}/${SALT_SCORE_ROUND_COUNT} 🧂\n\n${sequence}`;
  };

  const handleShare = () => {
    const shareString = getShareString();

    navigator.clipboard.writeText(shareString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (gameState === "finished") {
    const totalScore = results.filter((r) => r).length;
    const shareText = getShareString();
    return (
      <div className="page">
        <main className="main">
          <section className={styles.infoSection}>
            <SaltInfoBar />
          </section>

          <section className={styles.victorySection}>
            <h2 className={styles.victoryTitle}>Game Over!</h2>
            <p className={styles.victoryText}>
              You scored <strong>{totalScore}</strong> out of{" "}
              {SALT_SCORE_ROUND_COUNT}.
            </p>

            <div className={styles.victoryContent}>
              <div className={styles.sharePreviewContainer}>
                <p className={styles.previewHeading}>Your Results:</p>
                <pre className={styles.sharePreview}>{shareText}</pre>
                <button className={styles.shareButton} onClick={handleShare}>
                  <Share size={20} />
                  {copied ? "Copied!" : "Share Results"}
                </button>
              </div>

              <section className={styles.statsPanel}>
                <Stats
                  guesses={totalScore}
                  stats={stats}
                  statsLoading={statsLoading}
                  statsError={statsError}
                  formatScore={formatSaltScore}
                  averageLabel="avg score"
                />
              </section>

              <div className={styles.timer}>
                <span className={styles.timerText}>Next puzzle in: </span>
                <span className={styles.timerClock}>
                  {formatCountdown(countdown)}
                </span>
                <span>
                  <em>New puzzle every local midnight</em>
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (gameState === "loading" || !itemPairList || !minimumLoadingTimePassed) {
    return (
      <div className="page">
        <main className={`main ${styles.loadingPage}`} aria-busy="true">
          <section className={styles.loadingCard}>
            <ManaSpinner
              size={120}
              label="Loading today's Salt Score puzzle"
              showLabel={false}
            />

            <div className={styles.loadingCopy}>
              <p className={styles.loadingEyebrow}>Salt Score Mode</p>
              <h1>Shuffling Up the Saltiest Cards...</h1>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const currentPair = itemPairList[currentRound];
  const currentScores = revealedScores?.pairs.find(
    (p) => p.pair_number === currentPair.pair_number,
  );

  // Determine winner/loser classes
  let leftClass = styles.item;
  let rightClass = styles.item;

  if (selectedSide === "left") leftClass += ` ${styles.selected}`;
  if (selectedSide === "right") rightClass += ` ${styles.selected}`;

  if (revealed && currentScores) {
    const leftVal = currentScores.left.salt_score;
    const rightVal = currentScores.right.salt_score;

    if (leftVal > rightVal) {
      leftClass += ` ${styles.winner}`;
      rightClass += ` ${styles.loser}`;
    } else if (rightVal > leftVal) {
      rightClass += ` ${styles.winner}`;
      leftClass += ` ${styles.loser}`;
    } else {
      // Tie
      leftClass += ` ${styles.winner}`;
      rightClass += ` ${styles.winner}`;
    }
  }

  return (
    <div className="page">
      <main className="main">
        <section className={styles.infoSection}>
          <SaltInfoBar />
          <div className={styles.infoHeader}>
            <h1 className={styles.title}>
              Guess which Magic: The Gathering card is saltier!
            </h1>
          </div>
        </section>

        <section className={styles.gameContainer}>
          <h2>
            Round {currentRound + 1} of {SALT_SCORE_ROUND_COUNT}
          </h2>

          <div className={styles.cardRow}>
            {/* LEFT CARD */}
            <div
              className={`${styles.leftImage} ${getCardStatusClass("left")} ${cardLockClass}`}
              onClick={() => handleGuess("left")}
            >
              <Image
                src={currentPair.left.image_normal}
                alt={currentPair.left.name}
                width={300}
                height={420}
                className={`${styles.itemImage} ${styles.imageLeft}`}
              />
              {currentScores && (
                <div
                  className={`${styles.scoreOverlay} ${styles.left} ${
                    revealed ? styles.active : ""
                  }`}
                >
                  <CountUp
                    end={currentScores.left.salt_score}
                    start={revealed}
                  />
                </div>
              )}
            </div>

            {/* RIGHT CARD */}
            <div
              className={`${styles.rightImage} ${getCardStatusClass("right")} ${cardLockClass}`}
              onClick={() => handleGuess("right")}
            >
              <Image
                src={currentPair.right.image_normal}
                alt={currentPair.right.name}
                width={300}
                height={420}
                className={`${styles.itemImage} ${styles.imageRight}`}
              />
              {currentScores && (
                <div
                  className={`${styles.scoreOverlay} ${styles.right} ${
                    revealed ? styles.active : ""
                  }`}
                >
                  <CountUp
                    end={currentScores.right.salt_score}
                    start={revealed}
                  />
                </div>
              )}
            </div>
          </div>

          {revealed && (
            <div className={styles.resultContainer}>
              <div className={styles.result}>
                {isCorrect ? "Correct!" : "Incorrect!"}
              </div>
              <button className={styles.nextRoundBtn} onClick={handleNextRound}>
                {currentRound < LAST_ROUND_INDEX ? "Next Round" : "See Results"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
