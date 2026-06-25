import SaltInfoBar from "@/components/Info/Salt-Info/Salt-Info";
import styles from "./page.module.css";

export default function Page() {
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
          <h2>This Game is Coming Soon!</h2>
        </section>
      </main>
    </div>
  );
}
