"use client";
import SaltInfoBar from "@/components/Info/Salt-Info/Salt-Info";
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { Share } from "lucide-react";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";

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
function CountUp({ end, duration = 300 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(progress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toFixed(2)}</span>;
}

export default function Page() {
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

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const params = new URLSearchParams({ timezone });

    const fetchItems = async () => {
      try {
        const response = await fetch(
          `/api/salt-score/start-game?${params.toString()}`,
        );
        const data = await response.json();
        setItemPairList(data.pairs);
        setGameState("playing");
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };

    fetchItems();
  }, []);

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
    setResults((prev) => [...prev, isCorrect]);

    if (currentRound < 4) {
      setCurrentRound((prev) => prev + 1);
      setRevealed(false);
      setSelectedSide(null);
    } else {
      setGameState("finished");
    }
  };

  const getShareString = () => {
    const totalScore = results.filter((r) => r).length;
    const today = new Date();
    const dateStr = `${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
    const sequence = results.map((r) => (r ? "🟩" : "🟥")).join("");
    return `MTGdle: Salt Score ${dateStr} - ${totalScore}/5 🧂\n\n${sequence}`;
  };

  const handleShare = () => {
    const shareString = getShareString();

    navigator.clipboard.writeText(shareString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (gameState === "loading" || !itemPairList) {
    return <div>Loading...</div>;
  }

  if (gameState === "finished") {
    const totalScore = results.filter((r) => r).length;
    const shareText = getShareString();
    return (
      <div className="page">
        <main className="main">
          <section className={styles.victorySection}>
            <h2 className={styles.victoryTitle}>Game Over!</h2>
            <p className={styles.victoryText}>
              You scored <strong>{totalScore}</strong> out of 5.
            </p>

            <div className={styles.victoryContent}>
              <div className={styles.sharePreviewContainer}>
                <p className={styles.previewHeading}>Your Results:</p>
                <pre className={styles.sharePreview}>{shareText}</pre>
              </div>

              <button className={styles.shareButton} onClick={handleShare}>
                <Share size={20} />
                {copied ? "Copied!" : "Share Results"}
              </button>

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
          <h2>Round {currentRound + 1} of 5</h2>

          <div className={styles.cardRow}>
            <div className={leftClass} onClick={() => handleGuess("left")}>
              <img
                src={currentPair.left.image_normal}
                alt={currentPair.left.name}
                width="250"
                className={styles.itemImage}
              />
              <p>{currentPair.left.name}</p>
              {revealed && currentScores && (
                <div className={styles.scoreOverlay}>
                  <CountUp end={currentScores.left.salt_score} />
                </div>
              )}
            </div>

            <div className={rightClass} onClick={() => handleGuess("right")}>
              <img
                src={currentPair.right.image_normal}
                alt={currentPair.right.name}
                width="250"
                className={styles.itemImage}
              />
              <p>{currentPair.right.name}</p>
              {revealed && currentScores && (
                <div className={styles.scoreOverlay}>
                  <CountUp end={currentScores.right.salt_score} />
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
                {currentRound < 4 ? "Next Round" : "See Results"}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
