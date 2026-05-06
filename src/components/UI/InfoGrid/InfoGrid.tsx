import styles from "./InfoGrid.module.css";

type CellTone = "correct" | "partial" | "wrong" | "neutral";

type InfoCell = {
  value: React.ReactNode;
  tone?: CellTone;
};

type InfoGridRow = {
  card: InfoCell;
  colors: InfoCell;
  mana_value: InfoCell;
  type: InfoCell;
  subtypes: InfoCell;
  set: InfoCell;
  rarity: InfoCell;
  stats: InfoCell;
  keywords: InfoCell;
};

const columns: Array<{
  key: keyof InfoGridRow;
  label: string;
  className: string;
}> = [
  { key: "card", label: "Card", className: styles.card },
  { key: "colors", label: "Colors", className: styles.colors },
  { key: "mana_value", label: "Mana Value", className: styles.mana_value },
  { key: "type", label: "Type", className: styles.type },
  { key: "subtypes", label: "Subtypes", className: styles.subtypes },
  { key: "set", label: "Set", className: styles.set },
  { key: "rarity", label: "Rarity", className: styles.rarity },
  { key: "stats", label: "Stats", className: styles.stats },
  { key: "keywords", label: "Keywords", className: styles.keywords },
];

type InfoGridProps = {
  rows?: InfoGridRow[];
};

export default function InfoGrid({ rows = [] }: InfoGridProps) {
  return (
    <div className={styles.container}>
      <div className={styles.info_grid} role="grid" aria-label="Card info grid">
        {columns.map((column) => (
          <div
            key={`header-${column.key}`}
            className={`${styles.item} ${styles.header} ${column.className}`}
            role="columnheader"
          >
            {column.label}
          </div>
        ))}

        {rows.map((row, rowIndex) =>
          columns.map((column) => {
            const cell = row[column.key];

            return (
              <div
                key={`${rowIndex}-${column.key}`}
                className={[
                  styles.item,
                  styles.cell,
                  column.className,
                  cell.tone ? styles[cell.tone] : "",
                ].join(" ")}
                role="gridcell"
              >
                {cell.value}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
