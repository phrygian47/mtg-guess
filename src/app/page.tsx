import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "MTGdle - Daily Magic Card Guessing Game",
  description:
    "Play MTGDLE, a daily Magic: The Gathering card guessing game. Use clues like colors, mana value, type, set, rarity, tags, and release year to find the hidden card.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <div className={styles.page}>
      <main className="main">
        <section className={styles.hero}>
          <div className={styles.heading}>
            <h1 className={styles.title}>MTGDLE</h1>
            <p className={styles.subtitle}>
              A daily Magic: The Gathering card guessing game.
            </p>
          </div>

          <div className={styles.games}>
            <Link href="/classic" className={styles.button}>
              <span className={styles.button_title}>Classic</span>
              <span className={styles.button_subtitle}>
                Get Clues on Every Guess
              </span>
            </Link>
            <Link href="/art" className={styles.button}>
              <span className={styles.button_title}>Card Art</span>
              <span className={styles.button_subtitle}>
                Guess the Art From a Pixelated Image
              </span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
