import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import styles from "./SaltTutorialSection.module.css";

export default function SaltTutorialSection() {
  const countdown = useNextPuzzleCountdown();

  return (
    <div className={styles.container}>
      <h2>How to Play</h2>
      <hr />

      <p>
        Compare Magic cards by commander salt score. A new sequence is selected
        every 24 hours.
      </p>

      <div className={styles.timer}>
        <span className={styles.timer_text}>Next salt score in: </span>
        <span className={styles.timer_clock}>{formatCountdown(countdown)}</span>
        <span>
          <em>New sequence every local midnight</em>
        </span>
      </div>

      <p>
        Each round shows a new pair of cards. Guess whether the left or right
        card&apos;s salt score is higher or lower.
      </p>

      <ul className={styles.propertyList}>
        <li className={styles.propertyCard}>
          <h3>Sequence</h3>
          <p>The puzzle uses 10 cards total, 5 pairs of comparisons</p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Scores</h3>
          <p>
            Your score will be based whether or not you select the right card,
            it will be out of a 5 total points.
          </p>
        </li>
      </ul>
    </div>
  );
}
