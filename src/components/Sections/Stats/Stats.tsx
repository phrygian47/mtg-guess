import { useState, useEffect } from "react";
import styles from "./Stats.module.css";
import { GuessStats } from "@/lib/game/stats";

type StatsProps = {
  guesses: number;
  victoryStats: GuessStats | null;
  statsLoading: boolean;
  statsError: string | null;
};

export default function Stats({
  guesses,
  victoryStats,
  statsLoading,
  statsError,
}: StatsProps) {
  function formatGuessLabel(guesses: number) {
    return guesses === 1 ? "1 guess" : `${guesses} guesses`;
  }

  return (
    <section className={styles.statsPanel} aria-live="polite">
      <div className={styles.statsHeader}>
        <h3>Today&apos;s Results</h3>
        <span>{formatGuessLabel(guesses)}</span>
      </div>

      {statsLoading && (
        <p className={styles.statsMessage}>Loading results...</p>
      )}

      {statsError && <p className={styles.statsMessage}>{statsError}</p>}

      {victoryStats && (
        <>
          <div className={styles.statsSummary}>
            <div>
              <span className={styles.statValue}>
                {victoryStats.solvedCount}
              </span>
              <span className={styles.statLabel}>players solved</span>
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
              <div
                className={`${styles.statRow} ${
                  bucket.guesses === guesses ? styles.currentGuess : ""
                }`}
                key={bucket.guesses}
              >
                <span className={styles.guessCount}>{bucket.guesses}</span>

                <div
                  className={styles.barTrack}
                  role="meter"
                  aria-label={`${bucket.players} players solved in ${formatGuessLabel(
                    bucket.guesses,
                  )}`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(victoryStats.solvedCount, 1)}
                  aria-valuenow={bucket.players}
                >
                  <span
                    className={styles.barFill}
                    style={
                      {
                        "--bar-width": `${bucket.barWidth}%`,
                      } as React.CSSProperties
                    }
                  >
                    <span className={styles.barLabel}>
                      {bucket.players} · {bucket.share}%
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
