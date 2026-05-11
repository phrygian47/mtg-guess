import { InfoGridRow, InfoCell, InfoOtherCell } from "@/lib/game/types";
import styles from "./InfoGrid.module.css";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

type InfoGridProps = {
  rows: DisplayInfoGridRow[];
};

const CELL_ORDER: Array<{
  key: keyof InfoGridRow;
  label: string;
  type?: "card" | "other";
}> = [
  { key: "card", label: "Card", type: "card" },
  { key: "colors", label: "Colors" },
  { key: "mana_value", label: "Mana Value" },
  { key: "type", label: "Type" },
  { key: "subtypes", label: "Subtypes" },
  { key: "set", label: "Set" },
  { key: "rarity", label: "Rarity" },
  { key: "other", label: "Other", type: "other" },
];

export default function InfoGrid({ rows }: InfoGridProps) {
  if (rows.length === 0) return null;

  const getRevealStyle = (revealIndex: number, shouldAnimate: boolean) =>
    shouldAnimate ? { animationDelay: `${revealIndex * 120}ms` } : undefined;

  const getRevealClass = (shouldAnimate: boolean) =>
    shouldAnimate ? styles.revealCell : "";

  const renderInfoCell = (
    cell: InfoCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    return (
      <div
        className={`${styles.infoCell} ${getRevealClass(shouldAnimate)} ${
          styles[cell.tone ?? "neutral"]
        }`}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        {cell.value}
      </div>
    );
  };

  const renderCardCell = (
    cell: InfoCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const imageUrl = typeof cell.value === "string" ? cell.value : "";

    return (
      <div
        className={`${styles.infoCell} ${styles.cardCell} ${getRevealClass(
          shouldAnimate,
        )} ${styles[cell.tone ?? "neutral"]}`}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Guessed card" className={styles.cardImage} />
        ) : (
          cell.value
        )}
      </div>
    );
  };

  const renderOtherCell = (
    cell: InfoOtherCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    return (
      <div
        className={`${styles.infoCell} ${styles.neutral} ${styles.otherCell} ${getRevealClass(
          shouldAnimate,
        )}`}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={styles.otherValueList}>
          {cell.value.map((line) => (
            <div key={line.label} className={styles.otherValueLine}>
              <span className={styles.otherLabel}>{line.label}: </span>
              <span className={styles[`text_${line.tone}`]}>{line.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className={styles.infoGridSection}>
      <h2>Previous Guesses</h2>

      <div className={styles.infoGrid}>
        <div className={styles.infoGridRow}>
          {CELL_ORDER.map((cell) => (
            <div className={styles.infoHeader} key={cell.key}>
              {cell.label}
            </div>
          ))}
        </div>

        {rows.map(({ id, row }, rowIndex) => {
          const isNewestRow = rowIndex === rows.length - 1;

          return (
            <div className={styles.infoGridRow} key={id}>
              {CELL_ORDER.map((cell, cellIndex) => {
                const shouldAnimate = isNewestRow;
                const revealIndex = isNewestRow ? cellIndex : 0;

                if (cell.type === "card") {
                  return (
                    <div key={cell.key}>
                      {renderCardCell(row.card, revealIndex, shouldAnimate)}
                    </div>
                  );
                }

                if (cell.type === "other") {
                  return (
                    <div key={cell.key}>
                      {renderOtherCell(row.other, revealIndex, shouldAnimate)}
                    </div>
                  );
                }

                return (
                  <div key={cell.key}>
                    {renderInfoCell(
                      row[cell.key] as InfoCell,
                      revealIndex,
                      shouldAnimate,
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
