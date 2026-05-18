import { InfoGridRow, InfoCell, SetInfo } from "@/lib/game/types";
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
  type?: "card" | "set";
}> = [
  { key: "card", label: "Card", type: "card" },
  { key: "colors", label: "Colors" },
  { key: "mana_value", label: "Mana Value" },
  { key: "type_line", label: "Type Line" },
  { key: "set", label: "Set", type: "set" },
  { key: "rarity", label: "Rarity" },
  { key: "tags", label: "Tags" },
  { key: "release_year", label: "Release Year" },
];

export default function InfoGrid({ rows }: InfoGridProps) {
  if (rows.length === 0) return null;

  const getRevealStyle = (revealIndex: number, shouldAnimate: boolean) =>
    shouldAnimate
      ? {
          animationDelay: `${revealIndex * 120}ms`,
        }
      : undefined;

  const getRevealClass = (shouldAnimate: boolean) =>
    `${styles.revealWrapper} ${shouldAnimate ? styles.revealCell : ""}`;

  const renderInfoCell = (
    cell: InfoCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
          {cell.value}
        </div>
      </div>
    );
  };

  const renderSetCell = (
    cell: InfoCell<string | SetInfo[]>,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const value = cell.value;

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
          {Array.isArray(value) ? (
            <div className={styles.setList}>
              {value.map((set) => (
                <span key={set.code} className={styles.setItem}>
                  {set.image_uri && (
                    <img
                      src={set.image_uri}
                      alt={`${set.code} set icon`}
                      className={styles.set_icon}
                    />
                  )}

                  <span className={styles.set_name}>
                    {set.name ?? set.code}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            value
          )}
        </div>
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
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div
          className={`${styles.infoCell} ${styles.cardCell} ${
            styles[cell.tone ?? "neutral"]
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Guessed card"
              className={styles.cardImage}
            />
          ) : (
            cell.value
          )}
        </div>
      </div>
    );
  };

  const renderCell = (
    row: InfoGridRow,
    cell: (typeof CELL_ORDER)[number],
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    if (cell.type === "card") {
      return renderCardCell(row.card, revealIndex, shouldAnimate);
    }

    if (cell.type === "set") {
      return renderSetCell(row.set, revealIndex, shouldAnimate);
    }

    return renderInfoCell(
      row[cell.key] as InfoCell,
      revealIndex,
      shouldAnimate,
    );
  };

  return (
    <section className={styles.infoGridSection}>
      <h2>Previous Guesses</h2>

      <div className={styles.infoGridScroller}>
        <div className={styles.infoGrid}>
          <div className={styles.infoGridRow}>
            {CELL_ORDER.map((cell) => (
              <div className={styles.infoHeader} key={cell.key}>
                {cell.label}
              </div>
            ))}
          </div>

          {rows.map(({ id, row }, rowIndex) => {
            const isNewestRow = rowIndex === 0;

            return (
              <div className={styles.infoGridRow} key={id}>
                {CELL_ORDER.map((cell, cellIndex) => {
                  const shouldAnimate = isNewestRow;
                  const revealIndex = isNewestRow ? cellIndex : 0;

                  return (
                    <div key={cell.key}>
                      {renderCell(row, cell, revealIndex, shouldAnimate)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}