import styles from "./ClassicLoadingScreen.module.css";
import ManaSpinner from "@/components/UI/ManaSpinner/ManaSpinner";

export default function ClassicLoadingScreen() {
  return (
    <div className="page">
      <main className={`main ${styles.loadingPage}`} aria-busy="true">
        <section className={styles.loadingCard}>
          <ManaSpinner
            size={120}
            label="Loading today's Salt Score puzzle"
            showLabel={false}
          ></ManaSpinner>
          <div className={styles.loadingCopy}>
            <p className={styles.loadingEyebrow}>Classic Mode</p>
            <h1>Planeswalking Through the Blind Eternities</h1>
          </div>
        </section>
      </main>
    </div>
  );
}
