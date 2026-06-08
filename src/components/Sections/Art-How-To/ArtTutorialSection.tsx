import { formatCountdown, useNextPuzzleCountdown } from "@/lib/game/countdown";
import styles from "@/components/Sections/Classic-How-To/Tutorial-Section.module.css";

export default function ArtTutorialSection() {
  const countdown = useNextPuzzleCountdown();

  return (
    <div className={styles.container}>
      <h2>How to Play</h2>
      <hr />

      <p>
        Guess today&apos;s Magic: The Gathering card from a pixelated crop of
        its artwork. A new art puzzle is selected every 24 hours.
      </p>

      <div className={styles.timer}>
        <span className={styles.timer_text}>Next art in: </span>
        <span className={styles.timer_clock}>{formatCountdown(countdown)}</span>
        <span>
          <em>New art every local midnight</em>
        </span>
      </div>

      <p>
        Type a card name into the search bar and submit a guess. Each incorrect
        guess sharpens the artwork until the full image is revealed.
      </p>

      <ul className={styles.propertyList}>
        <li className={styles.propertyCard}>
          <h3>Pixel Reveal</h3>
          <p>
            The image begins heavily pixelated. Wrong guesses increase the
            resolution in steps, making the art easier to identify.
          </p>
        </li>

        <li className={styles.propertyCard}>
          <h3>Hints</h3>
          <p>
            After enough guesses, the set and mana cost hint unlocks. One guess
            later, the rules text hint unlocks when rules text is available.
          </p>
        </li>
      </ul>
    </div>
  );
}
