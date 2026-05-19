import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>MTGDLE</h1>
        <p className={styles.subtitle}>Choose a game mode to start playing.</p>

        <div className={styles.actions}>
          <Link href="/classic" className={styles.button}>
            Play Classic
          </Link>
        </div>
      </main>
    </div>
  );
}