import Image from "next/image";
import styles from "./ClassicLoadingScreen.module.css";

type ClassicLoadingScreenProps = {
  cardBackSrc: string;
};

export default function ClassicLoadingScreen({
  cardBackSrc,
}: ClassicLoadingScreenProps) {
  return (
    <div className="page">
      <main className={`main ${styles.loadingPage}`} aria-busy="true">
        <section className={styles.loadingCard}>
          <div className={styles.loadingCardBackFrame}>
            <Image
              src={cardBackSrc}
              alt="Magic: The Gathering card back"
              className={styles.loadingCardBack}
              width={146}
              height={204}
              preload
              unoptimized
            />
          </div>

          <div className={styles.loadingCopy}>
            <p className={styles.loadingEyebrow}>Classic Mode</p>
            <h1>Planeswalking Through the Blind Eternities...</h1>
          </div>
        </section>
      </main>
    </div>
  );
}
