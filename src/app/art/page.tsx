"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";

import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import ArtInfoBar from "@/components/Info/Art-Info/Art-Info";
import Stats from "@/components/Sections/Stats/Stats";
import YesterdayCard from "@/components/Sections/Yesterday/YesterdayCard";
import {
  loadArtProgress,
  saveArtProgress,
  type ArtProgressInput,
} from "@/lib/game/artProgress";
import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import { recordGameCompletion, type GuessStats } from "@/lib/game/stats";
import { parseManaCost, parseSymbolText } from "@/lib/game/manaSymbols";
import type { CardGuess } from "@/lib/question/types";
import { loadCardSearchIndex } from "@/lib/db/loadCardSearchIndex";
import { useVictoryScroll } from "@/lib/game/useVictoryScroll";

import styles from "./page.module.css";

import { ScrollText, Gem } from "lucide-react";

type ArtPuzzle = {
  puzzle_date: string;
  art_crop: string;
};

type SubmitArtGuessResult = {
  answer: boolean;
  name?: string;
  image_normal?: string | null;
  art_crop?: string | null;
  oracle_text?: string | null;
  mana_cost?: string | null;
  set_name?: string | null;
};

type GuessEntry = {
  id: string;
  name: string;
  correct: boolean;
};

type InitialArtPageState = {
  guesses: GuessEntry[];
  gameWon: boolean;
  winningCardName: string | null;
  winningCardImage: string | null;
  winningOracleId: string | null;
  completionRecorded: boolean;
  shouldRetryCompletionRecord: boolean;
  victoryStats: GuessStats | null;
  setNameHint: string | null;
  manaCostHint: string | null;
  rulesTextHint: string | null;
};

const PIXEL_WIDTH_STEPS = [24, 36, 56, 88, 140, 240];
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 518;
const FULL_REVEAL_GUESS_COUNT = PIXEL_WIDTH_STEPS.length;
const SET_AND_MANA_HINT_GUESS_COUNT = FULL_REVEAL_GUESS_COUNT;
const RULES_TEXT_HINT_GUESS_COUNT = FULL_REVEAL_GUESS_COUNT + 4;
const VICTORY_REVEAL_DELAY_MS = 350;
const RESTORED_VICTORY_DELAY_MS = 900;

export default function ArtPage() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [initialArtState] = useState(() => getEmptyArtPageState());
  const countdown = useNextPuzzleCountdown();
  const [puzzle, setPuzzle] = useState<ArtPuzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuessCard, setSelectedGuessCard] = useState<CardGuess | null>(
    null,
  );
  const [searchClearSignal, setSearchClearSignal] = useState(0);
  const [guesses, setGuesses] = useState<GuessEntry[]>(initialArtState.guesses);
  const [submitting, setSubmitting] = useState(false);
  const [gameWon, setGameWon] = useState(initialArtState.gameWon);
  const [showVictory, setShowVictory] = useState(false);
  const victoryRef = useVictoryScroll<HTMLDivElement>(showVictory);
  const [winningCardName, setWinningCardName] = useState<string | null>(
    initialArtState.winningCardName,
  );
  const [winningCardImage, setWinningCardImage] = useState<string | null>(
    initialArtState.winningCardImage,
  );
  const [winningOracleId, setWinningOracleId] = useState<string | null>(
    initialArtState.winningOracleId,
  );
  const [completionRecorded, setCompletionRecorded] = useState(
    initialArtState.completionRecorded,
  );
  const [shouldRetryCompletionRecord, setShouldRetryCompletionRecord] =
    useState(initialArtState.shouldRetryCompletionRecord);
  const [victoryStats, setVictoryStats] = useState<GuessStats | null>(
    initialArtState.victoryStats,
  );
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [setNameHint, setSetNameHint] = useState<string | null>(
    initialArtState.setNameHint,
  );
  const [manaCostHint, setManaCostHint] = useState<string | null>(
    initialArtState.manaCostHint,
  );
  const [rulesTextHint, setRulesTextHint] = useState<string | null>(
    initialArtState.rulesTextHint,
  );
  const [openHint, setOpenHint] = useState<"setMana" | "rules" | null>(null);

  const stepIndex = Math.min(guesses.length, PIXEL_WIDTH_STEPS.length - 1);

  const pixelWidth =
    gameWon || guesses.length >= FULL_REVEAL_GUESS_COUNT
      ? CANVAS_WIDTH
      : PIXEL_WIDTH_STEPS[stepIndex];

  const setAndManaHintUnlocked =
    guesses.length >= SET_AND_MANA_HINT_GUESS_COUNT;

  const rulesTextHintUnlocked = guesses.length >= RULES_TEXT_HINT_GUESS_COUNT;
  const setAndManaTriesRemaining = Math.max(
    0,
    SET_AND_MANA_HINT_GUESS_COUNT - guesses.length,
  );
  const rulesTextTriesRemaining = Math.max(
    0,
    RULES_TEXT_HINT_GUESS_COUNT - guesses.length,
  );

  const persistProgress = useCallback(
    (progress: ArtProgressInput) => saveArtProgress(timezone, progress),
    [timezone],
  );

  useEffect(() => {
    let restoreTimer: number | null = null;
    let victoryTimer: number | null = null;

    restoreTimer = window.setTimeout(() => {
      const savedProgress = loadArtProgress(timezone);

      if (!savedProgress) return;

      setGuesses(savedProgress.guesses);
      setGameWon(savedProgress.completed);
      setWinningCardName(savedProgress.winningCardName);
      setWinningCardImage(savedProgress.winningCardImage);
      setWinningOracleId(savedProgress.winningOracleId);
      setCompletionRecorded(savedProgress.completionRecorded);
      setShouldRetryCompletionRecord(
        savedProgress.completed && !savedProgress.completionRecorded,
      );
      setVictoryStats(savedProgress.stats);
      setSetNameHint(savedProgress.setNameHint);
      setManaCostHint(savedProgress.manaCostHint);
      setRulesTextHint(savedProgress.rulesTextHint);

      if (savedProgress.completed) {
        victoryTimer = window.setTimeout(() => {
          setShowVictory(true);
        }, RESTORED_VICTORY_DELAY_MS);
      }
    }, 0);

    return () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
      }

      if (victoryTimer !== null) {
        window.clearTimeout(victoryTimer);
      }
    };
  }, [timezone]);

  useEffect(() => {
    if (
      !shouldRetryCompletionRecord ||
      !gameWon ||
      completionRecorded ||
      !winningOracleId ||
      guesses.length === 0
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
          guesses.length,
          "art",
        );

        if (cancelled) return;

        setCompletionRecorded(true);
        setVictoryStats(stats);
        persistProgress({
          guesses,
          completed: true,
          winningCardName,
          winningCardImage,
          winningOracleId: recordingOracleId,
          completionRecorded: true,
          stats,
          setNameHint,
          manaCostHint,
          rulesTextHint,
        });
      } catch (recordError) {
        console.error("Could not record restored art stats:", recordError);

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
    guesses,
    manaCostHint,
    persistProgress,
    rulesTextHint,
    setNameHint,
    shouldRetryCompletionRecord,
    timezone,
    winningCardImage,
    winningCardName,
    winningOracleId,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadPuzzle() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ timezone });
        const res = await fetch(`/api/art/start-game?${params.toString()}`);

        if (!res.ok) {
          const message = await res.text();
          throw new Error(
            `Failed to load art puzzle: ${res.status} ${message}`,
          );
        }

        const data = (await res.json()) as ArtPuzzle;

        if (!cancelled) {
          setPuzzle(data);
        }
      } catch (loadError) {
        console.error("Could not load art puzzle:", loadError);

        if (!cancelled) {
          setError("The art puzzle is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPuzzle();

    return () => {
      cancelled = true;
    };
  }, [timezone]);

  useEffect(() => {
    if (!puzzle?.art_crop) {
      return;
    }

    let cancelled = false;
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const image = new window.Image();

    image.onload = () => {
      if (cancelled) {
        return;
      }

      drawPixelatedImage(canvas, image, pixelWidth);
    };

    image.onerror = () => {
      if (!cancelled) {
        setError("The art image could not be loaded.");
      }
    };

    image.src = puzzle.art_crop;

    return () => {
      cancelled = true;
    };
  }, [pixelWidth, puzzle?.art_crop]);

  function rankSearchResult(name: string, query: string) {
    const normalizedName = name.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedName === normalizedQuery) return 0;
    if (normalizedName.startsWith(normalizedQuery)) return 1;
    if (normalizedName.includes(` ${normalizedQuery}`)) return 2;
    return 3;
  }

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

  async function handleSubmitGuess(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedGuessCard || submitting || gameWon) {
      return;
    }

    const guessedCard = selectedGuessCard;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/art/submit-guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timezone,
          oracle_id: guessedCard.oracle_id,
          guess_count: guesses.length + 1,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(`Failed to submit art guess: ${res.status} ${message}`);
      }

      const result = (await res.json()) as SubmitArtGuessResult;
      const guessEntry = {
        id: crypto.randomUUID(),
        name: guessedCard.name,
        correct: result.answer,
      };
      const nextGuesses = [guessEntry, ...guesses];
      const nextGuessCount = guesses.length + 1;
      let nextSetNameHint = setNameHint;
      let nextManaCostHint = manaCostHint;
      let nextRulesTextHint = rulesTextHint;

      if (!result.answer) {
        if (nextGuessCount >= SET_AND_MANA_HINT_GUESS_COUNT) {
          nextSetNameHint = result.set_name ?? null;
          nextManaCostHint = result.mana_cost ?? null;
        }

        if (nextGuessCount >= RULES_TEXT_HINT_GUESS_COUNT) {
          nextRulesTextHint = result.oracle_text ?? null;
        }
      }

      setGuesses(nextGuesses);
      setSelectedGuessCard(null);
      setSearchClearSignal((value) => value + 1);

      if (result.answer) {
        setGameWon(true);
        setWinningCardName(result.name ?? guessedCard.name);
        setWinningCardImage(result.image_normal ?? result.art_crop ?? null);
        setWinningOracleId(guessedCard.oracle_id);
        setCompletionRecorded(false);
        setShouldRetryCompletionRecord(false);
        setVictoryStats(null);
        setStatsError(null);
        setStatsLoading(true);

        persistProgress({
          guesses: nextGuesses,
          completed: true,
          winningCardName: result.name ?? guessedCard.name,
          winningCardImage: result.image_normal ?? result.art_crop ?? null,
          winningOracleId: guessedCard.oracle_id,
          completionRecorded: false,
          stats: null,
          setNameHint: nextSetNameHint,
          manaCostHint: nextManaCostHint,
          rulesTextHint: nextRulesTextHint,
        });

        window.setTimeout(() => {
          setShowVictory(true);
        }, VICTORY_REVEAL_DELAY_MS);

        try {
          const stats = await recordGameCompletion(
            timezone,
            guessedCard.oracle_id,
            nextGuesses.length,
            "art",
          );

          setCompletionRecorded(true);
          setVictoryStats(stats);
          persistProgress({
            guesses: nextGuesses,
            completed: true,
            winningCardName: result.name ?? guessedCard.name,
            winningCardImage: result.image_normal ?? result.art_crop ?? null,
            winningOracleId: guessedCard.oracle_id,
            completionRecorded: true,
            stats,
            setNameHint: nextSetNameHint,
            manaCostHint: nextManaCostHint,
            rulesTextHint: nextRulesTextHint,
          });
        } catch (recordError) {
          console.error("Could not record art stats:", recordError);
          setStatsError("Stats are unavailable right now.");
        } finally {
          setStatsLoading(false);
        }

        return;
      }

      setSetNameHint(nextSetNameHint);
      setManaCostHint(nextManaCostHint);
      setRulesTextHint(nextRulesTextHint);

      persistProgress({
        guesses: nextGuesses,
        completed: false,
        winningCardName: null,
        winningCardImage: null,
        winningOracleId: null,
        completionRecorded: false,
        stats: null,
        setNameHint: nextSetNameHint,
        manaCostHint: nextManaCostHint,
        rulesTextHint: nextRulesTextHint,
      });
    } catch (submitError) {
      console.error("Could not submit art guess:", submitError);
      setError("That guess could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <main className="main">
        <section className={styles.shell}>
          <div className={styles.header}>
            <ArtInfoBar />
            {gameWon && winningCardName && !showVictory && (
              <p className={styles.subhead}>
                The card was <strong>{winningCardName}</strong>.
              </p>
            )}
          </div>

          {!gameWon && (
            <div className={styles.hintBox}>
              <h2>Guess the Magic: The Gathering art!</h2>

              <div className={styles.hintButtons}>
                <div className={styles.hintButton}>
                  <button
                    type="button"
                    className={styles.hintIconButton}
                    disabled={!setAndManaHintUnlocked}
                    onClick={() =>
                      setOpenHint((current) =>
                        current === "setMana" ? null : "setMana",
                      )
                    }
                    aria-label={
                      setAndManaHintUnlocked
                        ? "Reveal set and mana cost hint"
                        : `Set and mana cost hint unlocks after ${SET_AND_MANA_HINT_GUESS_COUNT} guesses`
                    }
                    title={
                      setAndManaHintUnlocked
                        ? "Reveal set + mana cost"
                        : `Unlocks after ${SET_AND_MANA_HINT_GUESS_COUNT} guesses`
                    }
                  >
                    <Gem aria-hidden="true" size={28} />
                  </button>
                  <span>Set/Cost in {setAndManaTriesRemaining} tries</span>
                </div>
                <div className={styles.hintButton}>
                  <button
                    type="button"
                    className={styles.hintIconButton}
                    disabled={!rulesTextHintUnlocked}
                    onClick={() =>
                      setOpenHint((current) =>
                        current === "rules" ? null : "rules",
                      )
                    }
                    aria-label={
                      rulesTextHintUnlocked
                        ? "Reveal rules text hint"
                        : `Rules text hint unlocks after ${RULES_TEXT_HINT_GUESS_COUNT} guesses`
                    }
                    title={
                      rulesTextHintUnlocked
                        ? "Reveal rules text"
                        : `Unlocks after ${RULES_TEXT_HINT_GUESS_COUNT} guesses`
                    }
                  >
                    <ScrollText aria-hidden="true" size={28} />
                  </button>
                  <span>Rules text in {rulesTextTriesRemaining} tries</span>
                </div>
              </div>
              {guesses.length === 0 && !showVictory && (
                <div>
                  <h2>Start typing to submit a guess...</h2>
                </div>
              )}

              <div
                className={`${styles.hintReveal} ${
                  openHint === "setMana" && setAndManaHintUnlocked
                    ? styles.hintRevealOpen
                    : ""
                }`}
              >
                <div className={styles.hintRevealInner}>
                  <dl className={styles.hintList}>
                    <dt>Set</dt>
                    <dd>{setNameHint || "No set available."}</dd>

                    <dt>Mana cost</dt>
                    <dd>
                      {manaCostHint ? (
                        <span className={styles.manaCostSymbols}>
                          {parseManaCost(manaCostHint).map((symbol, index) => (
                            <Image
                              key={`${symbol.raw}-${index}`}
                              src={symbol.src}
                              alt={symbol.alt}
                              title={symbol.raw}
                              width={24}
                              height={24}
                            />
                          ))}
                        </span>
                      ) : (
                        "No mana cost available."
                      )}
                    </dd>
                  </dl>
                </div>
              </div>

              <div
                className={`${styles.hintReveal} ${
                  openHint === "rules" && rulesTextHintUnlocked
                    ? styles.hintRevealOpen
                    : ""
                }`}
              >
                <div className={styles.hintRevealInner}>
                  <div className={styles.rulesHint}>
                    <h3>Rules text</h3>
                    <p className={styles.rulesText}>
                      {rulesTextHint
                        ? renderSymbolText(rulesTextHint)
                        : "No rules text available."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles.artStage}>
            {loading && (
              <p className={styles.status}>Loading today&apos;s art...</p>
            )}
            {!loading && error && <p className={styles.status}>{error}</p>}
            {!loading && puzzle && (
              <canvas
                ref={canvasRef}
                className={styles.artCanvas}
                aria-label="Pixelated Magic card art"
              />
            )}
          </div>

          {!gameWon && puzzle && !error && (
            <form
              className={styles.searchMenu}
              onSubmit={handleSubmitGuess}
              autoComplete="off"
            >
              <CustomSearchable
                id="art-guess-search"
                fetchOptions={fetchCardOptions}
                displayValue={(card) => card.name}
                renderOption={(card) => <div>{card.name}</div>}
                placeholder="Search for a card..."
                minQueryLength={2}
                onSelect={setSelectedGuessCard}
                clearSignal={searchClearSignal}
              />
            </form>
          )}

          {showVictory && (
            <section ref={victoryRef} className={styles.victorySection}>
              <h2 className={styles.victoryTitle}>You got it!</h2>
              <p className={styles.victoryText}>
                The card was <strong>{winningCardName}</strong>.
              </p>

              <div className={styles.victoryContent}>
                {winningCardImage && (
                  <Image
                    className={styles.victoryCard}
                    src={winningCardImage}
                    alt={winningCardName ?? "Winning card"}
                    width={488}
                    height={680}
                  />
                )}

                <section className={styles.statsPanel}>
                  <Stats
                    guesses={guesses.length}
                    stats={victoryStats}
                    statsLoading={statsLoading}
                    statsError={statsError}
                  />
                </section>

                <div className={styles.timer}>
                  <span className={styles.timerText}>Next art in: </span>
                  <span className={styles.timerClock}>
                    {formatCountdown(countdown)}
                  </span>
                  <span>
                    <em>New art every local midnight</em>
                  </span>
                </div>
              </div>
            </section>
          )}

          {guesses.length > 0 && (
            <ol className={styles.guessList} aria-label="Guesses">
              {guesses.map((guess) => (
                <li
                  key={guess.id}
                  className={
                    guess.correct
                      ? `${styles.guessItem} ${styles.correct}`
                      : styles.guessItem
                  }
                >
                  {guess.name}
                </li>
              ))}
            </ol>
          )}

          <div className={styles.yesterday}>
            <YesterdayCard mode="art" heading="Yesterday's art" />
          </div>
        </section>
      </main>
    </div>
  );
}

function getEmptyArtPageState(): InitialArtPageState {
  return {
    guesses: [],
    gameWon: false,
    winningCardName: null,
    winningCardImage: null,
    winningOracleId: null,
    completionRecorded: false,
    shouldRetryCompletionRecord: false,
    victoryStats: null,
    setNameHint: null,
    manaCostHint: null,
    rulesTextHint: null,
  };
}

function drawPixelatedImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  pixelWidth: number,
) {
  const aspectRatio = CANVAS_HEIGHT / CANVAS_WIDTH;
  const pixelHeight = Math.max(1, Math.round(pixelWidth * aspectRatio));
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const scratch = document.createElement("canvas");
  scratch.width = pixelWidth;
  scratch.height = pixelHeight;

  const scratchContext = scratch.getContext("2d");

  if (!scratchContext) {
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  scratchContext.imageSmoothingEnabled = true;
  scratchContext.drawImage(image, 0, 0, pixelWidth, pixelHeight);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(scratch, 0, 0, canvas.width, canvas.height);
}

function renderSymbolText(text: string) {
  return parseSymbolText(text).map((token, index) => {
    if (token.type === "text") {
      return <span key={`text-${index}`}>{token.value}</span>;
    }

    return (
      <Image
        key={`${token.raw}-${index}`}
        src={token.src}
        alt={token.alt}
        title={token.raw}
        className={styles.rulesTextSymbol}
        width={18}
        height={18}
      />
    );
  });
}
