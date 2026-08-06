"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";

import ManaSpinner from "@/components/UI/ManaSpinner/ManaSpinner";

import styles from "./SaltAnswers.module.css";

type AnswerCard = {
  oracle_id: string;
  name: string;
  image_normal: string;
};

type AnswerPair = {
  pair_number: number;
  left: AnswerCard;
  right: AnswerCard;
};

type AnswerScores = {
  pairs: {
    pair_number: number;
    left: { oracle_id: string; salt_score: number };
    right: { oracle_id: string; salt_score: number };
  }[];
};

type SaltAnswersProps = {
  pairs: AnswerPair[];
  scores: AnswerScores | null;
  results: boolean[];
  loading: boolean;
};

type Side = "left" | "right";

export default function SaltAnswers({
  pairs,
  scores,
  results,
  loading,
}: SaltAnswersProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (loading || !scores) {
    return (
      <section className={styles.panel}>
        <h3 className={styles.heading}>Answers</h3>
        {loading ? (
          <ManaSpinner
            size={72}
            label="Loading the answers"
            showLabel={false}
          />
        ) : (
          <p className={styles.status}>Answers are unavailable right now.</p>
        )}
      </section>
    );
  }

  const activePair = pairs[activeIndex];
  const activeScores = scores.pairs.find(
    (pair) => pair.pair_number === activePair?.pair_number,
  );

  // Arrow keys move between tabs, which is the expected behaviour for a
  // tablist and the reason focus is managed manually here.
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const lastIndex = pairs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight")
      nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === "ArrowLeft")
      nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = lastIndex;

    if (nextIndex === null) return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section className={styles.panel}>
      <h3 className={styles.heading}>Answers</h3>

      <div className={styles.tabList} role="tablist" aria-label="Round answers">
        {pairs.map((pair, index) => {
          const wasCorrect = results[index] === true;
          const isActive = index === activeIndex;

          return (
            <button
              key={pair.pair_number}
              type="button"
              role="tab"
              id={`salt-answer-tab-${pair.pair_number}`}
              aria-selected={isActive}
              aria-controls={`salt-answer-panel-${pair.pair_number}`}
              tabIndex={isActive ? 0 : -1}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""} ${
                wasCorrect ? styles.tabCorrect : styles.tabIncorrect
              }`}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className={styles.tabNumber}>{index + 1}</span>
              {wasCorrect ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <X size={14} aria-hidden="true" />
              )}
              <span className={styles.srOnly}>
                Round {index + 1}, {wasCorrect ? "correct" : "incorrect"}
              </span>
            </button>
          );
        })}
      </div>

      {activePair && activeScores && (
        <div
          className={styles.tabPanel}
          role="tabpanel"
          id={`salt-answer-panel-${activePair.pair_number}`}
          aria-labelledby={`salt-answer-tab-${activePair.pair_number}`}
          tabIndex={0}
        >
          {(["left", "right"] as Side[]).map((side) => {
            const card = activePair[side];
            const score = activeScores[side].salt_score;
            const otherScore =
              activeScores[side === "left" ? "right" : "left"].salt_score;
            const isSaltier = score >= otherScore;
            // Pairs are built to exclude ties, so correctness alone tells us
            // which card the player picked.
            const wasCorrect = results[activeIndex] === true;
            const wasPicked =
              results[activeIndex] === true ? isSaltier : !isSaltier;

            return (
              <div
                key={card.oracle_id}
                className={`${styles.card} ${
                  wasPicked
                    ? wasCorrect
                      ? styles.pickCorrect
                      : styles.pickWrong
                    : ""
                }`}
              >
                <Image
                  className={styles.cardImage}
                  src={card.image_normal}
                  alt={card.name}
                  width={244}
                  height={340}
                />
                <p className={styles.cardName}>{card.name}</p>
                <p className={styles.cardScore}>
                  <span className={styles.scoreValue}>{score.toFixed(2)}</span>
                  <span className={styles.scoreLabel}>salt score</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
