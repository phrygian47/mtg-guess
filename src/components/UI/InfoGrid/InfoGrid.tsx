import { InfoGridRow, InfoCell } from "@/lib/game/types";
import styles from "./InfoGrid.module.css";

type InfoGridProps = {
  rows: InfoGridRow[];
};

export default function InfoGrid({ rows }: InfoGridProps) {
  if (rows.length === 0) return null;

  const renderInfoCell = (cell: InfoCell) => {
    return (
      <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
        {cell.value}
      </div>
    );
  };

  const renderCardCell = (cell: InfoCell) => {
    const imageUrl = typeof cell.value === "string" ? cell.value : "";

    return (
      <div
        className={`${styles.infoCell} ${styles.cardCell} ${
          styles[cell.tone ?? "neutral"]
        }`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Guessed card" className={styles.cardImage} />
        ) : (
          cell.value
        )}
      </div>
    );
  };

  return (
    <section className={styles.infoGridSection}>
      <h2>Previous Guesses</h2>

      <div className={styles.infoGrid}>
        <div className={styles.infoGridRow}>
          <div className={styles.infoHeader}>Card</div>
          <div className={styles.infoHeader}>Colors</div>
          <div className={styles.infoHeader}>Mana Value</div>
          <div className={styles.infoHeader}>Type</div>
          <div className={styles.infoHeader}>Subtypes</div>
          <div className={styles.infoHeader}>Set</div>
          <div className={styles.infoHeader}>Rarity</div>
          <div className={styles.infoHeader}>Stats</div>
          <div className={styles.infoHeader}>Keywords</div>
        </div>

        {rows.map((row, index) => (
          <div className={styles.infoGridRow} key={index}>
            {renderCardCell(row.card)}
            {renderInfoCell(row.colors)}
            {renderInfoCell(row.mana_value)}
            {renderInfoCell(row.type)}
            {renderInfoCell(row.subtypes)}
            {renderInfoCell(row.set)}
            {renderInfoCell(row.rarity)}
            {renderInfoCell(row.stats)}
            {renderInfoCell(row.keywords)}
          </div>
        ))}
      </div>
    </section>
  );
}
