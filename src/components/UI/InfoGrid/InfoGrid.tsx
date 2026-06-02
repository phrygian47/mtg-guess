import { InfoGridRow, InfoCell, SetInfo } from "@/lib/game/types";
import { ManaSymbolMap } from "@/lib/game/manaSymbols";
import styles from "./InfoGrid.module.css";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

type InfoGridProps = {
  rows: DisplayInfoGridRow[];
  manaSymbolsBySymbol: ManaSymbolMap;
};

type CellType = "card" | "set" | "colors" | "rarity";

const CELL_ORDER: Array<{
  key: keyof InfoGridRow;
  label: string;
  type?: CellType;
}> = [
  { key: "card", label: "Card", type: "card" },
  { key: "colors", label: "Colors", type: "colors" },
  { key: "mana_value", label: "Mana Value" },
  { key: "type_line", label: "Type Line" },
  { key: "set", label: "Set", type: "set" },
  { key: "rarity", label: "Rarity", type: "rarity" },
  { key: "tags", label: "Tags" },
];

const formatTypeLine = (value: InfoCell["value"]): string => {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  return value.replace(/\s+—\s+/g, " ");
};

const getSetDirectionClass = (value: string | SetInfo) => {
  if (typeof value !== "object" || value === null) {
    return "";
  }

  if (value.release_year_direction === "higher") {
    return styles.yearHigher;
  }

  if (value.release_year_direction === "lower") {
    return styles.yearLower;
  }

  return "";
};

const normalizeColorSymbols = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((color) => color.trim().toUpperCase())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  const normalized = value.trim().toUpperCase();

  if (normalized === "COLORLESS" || normalized === "NONE") {
    return ["C"];
  }

  return normalized
    .replace(/[^WUBRGC]/g, "")
    .split("")
    .filter(Boolean);
};

const getRarityClass = (value: unknown) => {
  if (typeof value !== "string") return "";

  switch (value.toLowerCase()) {
    case "common":
      return styles.rarityCommon;
    case "uncommon":
      return styles.rarityUncommon;
    case "rare":
      return styles.rarityRare;
    case "mythic":
    case "mythic rare":
      return styles.rarityMythic;
    default:
      return "";
  }
};

export default function InfoGrid({ rows, manaSymbolsBySymbol }: InfoGridProps) {
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
    key?: keyof InfoGridRow,
  ) => {
    const displayValue =
      key === "type_line" ? formatTypeLine(cell.value) : cell.value;

    const columnClass = key === "mana_value" ? styles.manaValueCell : "";

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div
          className={`${styles.infoCell} ${
            styles[cell.tone ?? "neutral"]
          } ${columnClass}`}
        >
          {displayValue}
        </div>
      </div>
    );
  };

  const renderColorsCell = (
    cell: InfoCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const colors = normalizeColorSymbols(cell.value);

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
          {colors.length > 0 ? (
            <div className={styles.manaSymbols}>
              {colors.map((color) => {
                const symbol = manaSymbolsBySymbol[color];

                return symbol?.svg_uri ? (
                  <img
                    key={color}
                    src={symbol.svg_uri}
                    alt={symbol.english ?? `${color} mana`}
                    title={symbol.english ?? color}
                    className={styles.manaSymbol}
                  />
                ) : (
                  <span key={color}>{color}</span>
                );
              })}
            </div>
          ) : (
            cell.value
          )}
        </div>
      </div>
    );
  };

  const renderSetCell = (
    cell: InfoCell<string | SetInfo>,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const value = cell.value;

    const getReleaseYearDirectionIcon = (
      direction?: SetInfo["release_year_direction"],
    ) => {
      if (direction === "higher") {
        return {
          src: "/icons/chevrons-up.svg",
          alt: "Answer was released later",
        };
      }

      if (direction === "lower") {
        return {
          src: "/icons/chevrons-down.svg",
          alt: "Answer was released earlier",
        };
      }

      return null;
    };

    const isSetInfo = typeof value === "object" && value !== null;

    if (!isSetInfo) {
      return (
        <div
          className={getRevealClass(shouldAnimate)}
          style={getRevealStyle(revealIndex, shouldAnimate)}
        >
          <div
            className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}
          >
            {value}
          </div>
        </div>
      );
    }

    const directionIcon = getReleaseYearDirectionIcon(
      value.release_year_direction,
    );

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div
          className={`${styles.infoCell} ${styles.setCell} ${
            styles[cell.tone ?? "neutral"]
          }`}
        >
          {directionIcon && (
            <img
              src={directionIcon.src}
              alt={directionIcon.alt}
              title={directionIcon.alt}
              className={styles.setYearDirectionOverlay}
            />
          )}

          <div className={styles.setItem}>
            {value.image_uri && (
              <span
                className={styles.set_icon}
                style={
                  {
                    "--icon-url": `url(${value.image_uri})`,
                  } as React.CSSProperties
                }
              />
            )}

            <span className={styles.set_name}>{value.name ?? value.code}</span>

            {value.release_year && (
              <span className={styles.setYear}>{value.release_year}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderRarityCell = (
    cell: InfoCell,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const rarityIcon = "/card-symbols/sym-pw.svg";
    const rarityClass = getRarityClass(cell.value);
    const value = cell.value as string;

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
          <div className={styles.rarityContent}>
            <span
              className={`${styles.rarityIcon} ${rarityClass}`}
              style={
                {
                  "--rarity-icon-url": `url(${rarityIcon})`,
                } as React.CSSProperties
              }
              aria-hidden="true"
            />

            <span>{value.charAt(0).toUpperCase() + value.slice(1)}</span>
          </div>
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
          const isNewestRow = rowIndex === 0;

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

                if (cell.type === "colors") {
                  return (
                    <div key={cell.key}>
                      {renderColorsCell(
                        row.colors as InfoCell,
                        revealIndex,
                        shouldAnimate,
                      )}
                    </div>
                  );
                }

                if (cell.type === "set") {
                  return (
                    <div key={cell.key}>
                      {renderSetCell(row.set, revealIndex, shouldAnimate)}
                    </div>
                  );
                }

                if (cell.type === "rarity") {
                  return (
                    <div key={cell.key}>
                      {renderRarityCell(row.rarity, revealIndex, shouldAnimate)}
                    </div>
                  );
                }

                return (
                  <div key={cell.key}>
                    {renderInfoCell(
                      row[cell.key] as InfoCell,
                      revealIndex,
                      shouldAnimate,
                      cell.key,
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
