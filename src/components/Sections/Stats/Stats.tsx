import styles from "./Stats.module.css";
import type { GuessStats } from "@/lib/game/stats";

type StatsProps = {
  guesses?: number;
  stats: GuessStats | null;
  statsLoading: boolean;
  statsError: string | null;
  formatScore?: (score: number) => string;
  averageLabel?: string;
};

function formatDefaultScore(guesses: number) {
  return guesses === 1 ? "1 guess" : `${guesses} guesses`;
}

export default function Stats({
  guesses,
  stats,
  statsLoading,
  statsError,
  formatScore = formatDefaultScore,
  averageLabel = "avg guesses",
}: StatsProps) {
  return (
    <section className={styles.statsPanel} aria-live="polite">
      <div className={styles.statsHeader}>
        <h3>Today&apos;s Results</h3>
        {guesses !== undefined && <span>{formatScore(guesses)}</span>}
      </div>

      {statsLoading && (
        <p className={styles.statsMessage}>Loading results...</p>
      )}

      {statsError && <p className={styles.statsMessage}>{statsError}</p>}

      {stats && (
        <>
          <div className={styles.statsSummary}>
            <div>
              <span className={styles.statValue}>
                {stats.solvedCount}
              </span>
              <span className={styles.statLabel}>players solved</span>
            </div>
            <div>
              <span className={styles.statValue}>
                {stats.averageGuesses?.toFixed(1) ?? "—"}
              </span>
              <span className={styles.statLabel}>{averageLabel}</span>
            </div>
          </div>

          <div className={styles.distribution}>
            {stats.distribution.map((bucket) => (
              <div
                className={`${styles.statRow} ${
                  guesses !== undefined && bucket.guesses === guesses
                    ? styles.currentGuess
                    : ""
                }`}
                key={bucket.guesses}
              >
                <span className={styles.guessCount}>{bucket.guesses}</span>

                <div
                  className={styles.barTrack}
                  role="meter"
                  aria-label={`${formatScore(bucket.guesses)}: ${
                    bucket.players
                  } players`}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(stats.solvedCount, 1)}
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
