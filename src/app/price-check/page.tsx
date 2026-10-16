"use client";

import Image from "next/image";
import { Share } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import ManaSpinner from "@/components/UI/ManaSpinner/ManaSpinner";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import {
  formatPrice,
  loadPriceCheckProgress,
  savePriceCheckProgress,
  type PriceCheckProgressInput,
  type PriceCheckRound,
} from "@/lib/game/priceCheckProgress";

import styles from "./page.module.css";

type Side = "left" | "right";
type GameState = "loading" | "playing" | "finished" | "unavailable";

type Choice = {
  name: string;
  image: string;
};

type Pair = {
  pair_number: number;
  left: Choice;
  right: Choice;
};

type GuessResponse = {
  correct: boolean;
  left_price_cents: number;
  right_price_cents: number;
};

const MIN_LOADING_MS = 100;

function CountUpPrice({ cents }: { cents: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let startTimestamp: number | null = null;
    const duration = 1000;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;

      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(easeOut * cents));

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [cents]);

  return <span>{formatPrice(value)}</span>;
}

function ChoiceButton({
  side,
  choice,
  pairNumber,
  reveal,
  disabled,
  onPick,
}: {
  side: Side;
  choice: Choice;
  pairNumber: number;
  reveal: PriceCheckRound | undefined;
  disabled: boolean;
  onPick: (side: Side) => void;
}) {
  const priceCents = reveal
    ? side === "left"
      ? reveal.leftCents
      : reveal.rightCents
    : null;
  const otherCents = reveal
    ? side === "left"
      ? reveal.rightCents
      : reveal.leftCents
    : null;

  const classNames = [styles.choice];

  if (disabled) classNames.push(styles.locked);
  if (reveal && priceCents !== null && otherCents !== null) {
    classNames.push(priceCents > otherCents ? styles.winner : styles.loser);
  }
  if (reveal?.chosen === side) classNames.push(styles.picked);

  return (
    <button
      type="button"
      className={classNames.join(" ")}
      onClick={() => onPick(side)}
      disabled={disabled}
      aria-label={`Choose ${choice.name}`}
    >
      <div className={styles.imageFrame}>
        <Image
          src={choice.image}
          alt={choice.name}
          fill
          sizes="340px"
          style={{ objectFit: "contain" }}
        />
        <div
          className={`${styles.priceOverlay} ${reveal ? styles.active : ""}`}
        >
          {priceCents !== null && (
            <CountUpPrice key={`${pairNumber}-${side}`} cents={priceCents} />
          )}
        </div>
      </div>
      <span className={styles.itemName}>{choice.name}</span>
    </button>
  );
}

export default function Page() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const countdown = useNextPuzzleCountdown();

  const [gameState, setGameState] = useState<GameState>("loading");
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [rounds, setRounds] = useState<PriceCheckRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [isGuessing, setIsGuessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [minimumLoadingTimePassed, setMinimumLoadingTimePassed] =
    useState(false);

  const persistProgress = useCallback(
    (input: PriceCheckProgressInput) => savePriceCheckProgress(timezone, input),
    [timezone],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => setMinimumLoadingTimePassed(true),
      MIN_LOADING_MS,
    );

    return () => window.clearTimeout(timer);
  }, []);

  // Restore today's saved progress so a refresh returns to the same round.
  // Deferred a tick because localStorage isn't readable during SSR.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedProgress = loadPriceCheckProgress(timezone);

      if (!savedProgress) return;

      setRounds(savedProgress.rounds);
      setCurrentRound(savedProgress.currentRound);

      if (savedProgress.completed) {
        setGameState("finished");
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [timezone]);

  useEffect(() => {
    const params = new URLSearchParams({ timezone });

    async function fetchPairs() {
      try {
        const response = await fetch(
          `/api/price-check/start-game?${params.toString()}`,
        );

        if (!response.ok) {
          setGameState("unavailable");
          return;
        }

        const data = (await response.json()) as { pairs: Pair[] };

        setPairs(data.pairs);
        setGameState((current) =>
          current === "finished" ? current : "playing",
        );
      } catch (error) {
        console.error("Error fetching Price Check puzzle:", error);
        setGameState("unavailable");
      }
    }

    fetchPairs();
  }, [timezone]);

  const handleGuess = async (side: Side) => {
    if (!pairs || isGuessing) return;

    const pair = pairs[currentRound];

    if (!pair || rounds[currentRound]) return;

    setIsGuessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/price-check/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timezone,
          pair_number: pair.pair_number,
          side,
        }),
      });

      if (!response.ok) {
        throw new Error(`Guess failed: ${response.status}`);
      }

      const data = (await response.json()) as GuessResponse;
      const nextRounds = [
        ...rounds.slice(0, currentRound),
        {
          chosen: side,
          correct: data.correct,
          leftCents: data.left_price_cents,
          rightCents: data.right_price_cents,
        },
      ];

      setRounds(nextRounds);
      persistProgress({
        rounds: nextRounds,
        currentRound,
        completed: false,
      });
    } catch (error) {
      console.error("Could not check Price Check answer:", error);
      setErrorMessage("Couldn't check that answer. Please try again.");
    } finally {
      setIsGuessing(false);
    }
  };

  const handleNextRound = () => {
    if (!pairs) return;

    if (currentRound < pairs.length - 1) {
      const nextRound = currentRound + 1;

      setCurrentRound(nextRound);
      persistProgress({ rounds, currentRound: nextRound, completed: false });
    } else {
      setGameState("finished");
      persistProgress({ rounds, currentRound, completed: true });
    }
  };

  const getShareString = () => {
    const score = rounds.filter((round) => round.correct).length;
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    const sequence = rounds.map((round) => (round.correct ? "🟩" : "🟥")).join("");

    return `MTGdle: Price Check ${dateStr} - ${score}/${pairs?.length ?? rounds.length} 💰\n\n${sequence}`;
  };

  const handleShare = () => {
    navigator.clipboard.writeText(getShareString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (gameState === "unavailable") {
    return (
      <div className="page">
        <main className="main">
          <section className={styles.infoSection}>
            <div className={styles.infoHeader}>
              <h1 className={styles.title}>MTG Price Check</h1>
              <p className={styles.message}>
                There&apos;s no puzzle ready right now. Please check back soon!
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (gameState === "loading" || !pairs || !minimumLoadingTimePassed) {
    return (
      <div className="page">
        <main className={`main ${styles.loadingPage}`} aria-busy="true">
          <section className={styles.loadingCard}>
            <ManaSpinner
              size={120}
              label="Loading today's Price Check puzzle"
              showLabel={false}
            />

            <div className={styles.loadingCopy}>
              <p className={styles.loadingEyebrow}>Price Check Mode</p>
              <h1>Checking the Price Tags...</h1>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (gameState === "finished") {
    const score = rounds.filter((round) => round.correct).length;

    return (
      <div className="page">
        <main className="main">
          <section className={styles.victorySection}>
            <h2 className={styles.victoryTitle}>Game Over!</h2>
            <p className={styles.victoryText}>
              You scored <strong>{score}</strong> out of {pairs.length}.
            </p>

            <div className={styles.victoryContent}>
              <div className={styles.sharePreviewContainer}>
                <p className={styles.previewHeading}>Your Results:</p>
                <pre className={styles.sharePreview}>{getShareString()}</pre>
                <button className={styles.shareButton} onClick={handleShare}>
                  <Share size={20} />
                  {copied ? "Copied!" : "Share Results"}
                </button>
              </div>

              <section className={styles.answers}>
                <h3 className={styles.answersHeading}>Today&apos;s answers</h3>
                {pairs.map((pair, index) => {
                  const round = rounds[index];

                  if (!round) return null;

                  const leftMore = round.leftCents > round.rightCents;

                  return (
                    <div key={pair.pair_number} className={styles.answerRow}>
                      <span className={styles.answerMark}>
                        {round.correct ? "🟩" : "🟥"}
                      </span>
                      <div className={styles.answerSide}>
                        <span className={styles.answerName}>
                          {pair.left.name}
                        </span>
                        <span
                          className={`${styles.answerPrice} ${leftMore ? styles.answerMore : ""}`}
                        >
                          {formatPrice(round.leftCents)}
                        </span>
                      </div>
                      <span className={styles.answerVs}>vs</span>
                      <div className={styles.answerSide}>
                        <span className={styles.answerName}>
                          {pair.right.name}
                        </span>
                        <span
                          className={`${styles.answerPrice} ${leftMore ? "" : styles.answerMore}`}
                        >
                          {formatPrice(round.rightCents)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>

              <div className={styles.timer}>
                <span>Next puzzle in: </span>
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

  const currentPair = pairs[currentRound];
  const reveal = rounds[currentRound];
  const isLastRound = currentRound >= pairs.length - 1;

  return (
    <div className="page">
      <main className="main">
        <section className={styles.infoSection}>
          <div className={styles.infoHeader}>
            <h1 className={styles.title}>Which costs more?</h1>
            <p className={styles.subtitle}>
              A Magic card or an everyday item. Pick the pricier one.
            </p>
          </div>
        </section>

        <section className={styles.gameContainer}>
          <h2>
            Round {currentRound + 1} of {pairs.length}
          </h2>

          <div className={styles.choiceRow}>
            <ChoiceButton
              side="left"
              choice={currentPair.left}
              pairNumber={currentPair.pair_number}
              reveal={reveal}
              disabled={isGuessing || !!reveal}
              onPick={handleGuess}
            />
            <ChoiceButton
              side="right"
              choice={currentPair.right}
              pairNumber={currentPair.pair_number}
              reveal={reveal}
              disabled={isGuessing || !!reveal}
              onPick={handleGuess}
            />
          </div>

          {errorMessage && <p className={styles.message}>{errorMessage}</p>}

          {reveal && (
            <div className={styles.resultContainer}>
              <div className={styles.result}>
                {reveal.correct ? "Correct!" : "Incorrect!"}
              </div>
              <button className={styles.nextRoundBtn} onClick={handleNextRound}>
                {isLastRound ? "See Results" : "Next Round"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
