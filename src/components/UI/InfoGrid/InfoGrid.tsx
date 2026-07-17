"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  InfoGridRow,
  InfoCell,
  SetInfo,
  SupplementalInfoBadge,
} from "@/lib/game/types";
import { ManaSymbolMap } from "@/lib/game/manaSymbols";
import styles from "./InfoGrid.module.css";
import Image from "next/image";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow | null;
  submittedAt?: number;
  pending?: boolean;
};

type InfoGridProps = {
  rows: DisplayInfoGridRow[];
  manaSymbolsBySymbol: ManaSymbolMap;
};

type CellType =
  | "card"
  | "set"
  | "colors"
  | "rarity"
  | "supplemental"
  | "mana_value";

const CELL_ORDER: Array<{
  key: keyof InfoGridRow;
  label: string;
  type?: CellType;
}> = [
  { key: "card", label: "Card", type: "card" },
  { key: "colors", label: "Colors", type: "colors" },
  { key: "mana_value", label: "Mana Value", type: "mana_value" },
  { key: "type_line", label: "Type Line" },
  { key: "set", label: "Set", type: "set" },
  { key: "rarity", label: "Rarity", type: "rarity" },
  { key: "tags", label: "Tags" },
  { key: "supplemental_info", label: "Other Info", type: "supplemental" },
];

const CELL_SWEEP_STAGGER_MS = 50;
const CELL_SWEEP_DURATION_MS = 350;
const CELL_FLIP_STAGGER_MS = 100;
const CARD_IMAGE_PRELOAD_TIMEOUT_MS = 2500;

const SWEEP_TOTAL_MS =
  (CELL_ORDER.length - 1) * CELL_SWEEP_STAGGER_MS + CELL_SWEEP_DURATION_MS;

const formatTypeLine = (value: InfoCell["value"]): string => {
  if (typeof value !== "string") {
    return String(value ?? "");
  }

  return value.replace(/\s+—\s+/g, " ");
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

async function preloadImage(src: string | null) {
  if (!src || typeof window === "undefined") return;

  const image = new window.Image();
  image.decoding = "async";
  image.src = src;

  const imageReady = image.decode
    ? image.decode().catch(() => undefined)
    : new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });

  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, CARD_IMAGE_PRELOAD_TIMEOUT_MS);
  });

  await Promise.race([imageReady, timeout]);
}

export default function InfoGrid({ rows, manaSymbolsBySymbol }: InfoGridProps) {
  const [flipReadyRowIds, setFlipReadyRowIds] = useState<string[]>([]);

  useEffect(() => {
    const newestRow = rows[0];

    if (
      !newestRow ||
      !newestRow.row ||
      flipReadyRowIds.includes(newestRow.id)
    ) {
      return;
    }

    let cancelled = false;

    const cardImageUrl =
      typeof newestRow.row.card.value === "string"
        ? newestRow.row.card.value
        : null;

    const elapsedSinceSubmit =
      newestRow.submittedAt !== undefined
        ? window.performance.now() - newestRow.submittedAt
        : 0;

    const remainingSweepMs = Math.max(0, SWEEP_TOTAL_MS - elapsedSinceSubmit);

    const sweepFinished = new Promise<void>((resolve) => {
      window.setTimeout(resolve, remainingSweepMs);
    });

    async function waitForFlip() {
      await Promise.all([sweepFinished, preloadImage(cardImageUrl)]);

      if (!cancelled) {
        setFlipReadyRowIds((prev) =>
          prev.includes(newestRow.id) ? prev : [...prev, newestRow.id],
        );
      }
    }

    waitForFlip();

    return () => {
      cancelled = true;
    };
  }, [flipReadyRowIds, rows]);

  if (rows.length === 0) return null;

  const getRevealStyle = (_revealIndex: number, _shouldAnimate: boolean) =>
    undefined;

  const getRevealClass = (_shouldAnimate: boolean) => styles.revealWrapper;

  const renderAnimatedCell = (
    content: ReactNode,
    cellIndex: number,
    shouldAnimate: boolean,
    canFlip: boolean,
    isCard = false,
  ) => {
    if (!shouldAnimate) {
      return content;
    }

    return (
      <div
        className={`${styles.cellStage} ${
          canFlip ? styles.cellStageFlipReady : ""
        } ${isCard ? styles.cardStage : ""}`}
        style={
          {
            "--sweep-delay": `${cellIndex * CELL_SWEEP_STAGGER_MS}ms`,
            "--flip-delay": `${cellIndex * CELL_FLIP_STAGGER_MS}ms`,
          } as React.CSSProperties
        }
      >
        <div className={styles.cellFlipper}>
          <div className={`${styles.cellFace} ${styles.cardBackFace}`}>
            <Image
              src="/card_back.webp"
              alt=""
              aria-hidden="true"
              decoding="async"
              loading="eager"
              className={styles.cardBackImage}
              width={146}
              height={204}
            />
          </div>

          <div className={`${styles.cellFace} ${styles.hintFace}`}>
            {content}
          </div>
        </div>
      </div>
    );
  };

  const renderPendingCell = (
    cellIndex: number,
    shouldAnimate: boolean,
    isCard = false,
  ) => {
    return renderAnimatedCell(null, cellIndex, shouldAnimate, false, isCard);
  };

  const renderManaValueCell = (
    cell: InfoGridRow["mana_value"],
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    const getManaValueDirectionIcon = (
      direction?: InfoGridRow["mana_value"]["direction"],
    ) => {
      if (direction === "higher") {
        return {
          src: "/icons/chevrons-up.svg",
          alt: "Answer mana value is higher",
        };
      }

      if (direction === "lower") {
        return {
          src: "/icons/chevrons-down.svg",
          alt: "Answer mana value is lower",
        };
      }

      return null;
    };

    const directionIcon = getManaValueDirectionIcon(cell.direction);

    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div
          className={`${styles.infoCell} ${styles.manaValueCell} ${
            styles[cell.tone ?? "neutral"]
          }`}
        >
          {directionIcon && (
            <Image
              src={directionIcon.src}
              alt={directionIcon.alt}
              title={directionIcon.alt}
              className={styles.manaValueDirectionOverlay}
              width={146}
              height={204}
            />
          )}

          <span className={styles.manaValueText}>{cell.value}</span>
        </div>
      </div>
    );
  };

  const renderSupplementalInfoCell = (
    cell: InfoCell<SupplementalInfoBadge[]>,
    revealIndex: number,
    shouldAnimate: boolean,
  ) => {
    return (
      <div
        className={getRevealClass(shouldAnimate)}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div className={`${styles.infoCell} ${styles[cell.tone ?? "neutral"]}`}>
          {cell.value.length > 0 ? (
            <div className={styles.supplementalBadges}>
              {cell.value.map((badge) => (
                <div key={badge.label} className={styles.supplementalItem}>
                  <span
                    className={`${styles.supplementalBadgeLabel} ${
                      styles[badge.tone ?? "neutral"]
                    }`}
                  >
                    {badge.label}
                  </span>

                  <span className={styles.supplementalBadgeValue}>
                    {badge.kind === "mana" ? (
                      badge.value === "—" ? (
                        "—"
                      ) : (
                        <div className={styles.manaSymbols}>
                          {normalizeColorSymbols(badge.value).map((color) => {
                            const symbol = manaSymbolsBySymbol[color];

                            return symbol?.svg_uri ? (
                              <Image
                                key={color}
                                src={symbol.svg_uri}
                                alt={symbol.english ?? `${color} mana`}
                                title={symbol.english ?? color}
                                className={styles.smallManaSymbol}
                                width={146}
                                height={204}
                              />
                            ) : (
                              <span key={color}>{color}</span>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      badge.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            "—"
          )}
        </div>
      </div>
    );
  };

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
                  <Image
                    key={color}
                    src={symbol.svg_uri}
                    alt={symbol.english ?? `${color} mana`}
                    title={symbol.english ?? color}
                    className={styles.manaSymbol}
                    width={146}
                    height={204}
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
            <Image
              src={directionIcon.src}
              alt={directionIcon.alt}
              title={directionIcon.alt}
              className={styles.setYearDirectionOverlay}
              width={146}
              height={204}
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
        className={`${getRevealClass(shouldAnimate)} ${
          styles.cardRevealWrapper
        }`}
        style={getRevealStyle(revealIndex, shouldAnimate)}
      >
        <div
          className={`${styles.infoCell} ${styles.cardCell} ${
            styles[cell.tone ?? "neutral"]
          }`}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Guessed card"
              decoding="async"
              fetchPriority="high"
              loading="eager"
              className={styles.cardImage}
              width={146}
              height={204}
              preload
              unoptimized
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
          const shouldAnimate = isNewestRow;
          const canFlip = flipReadyRowIds.includes(id);

          if (!row) {
            return (
              <div className={styles.infoGridRow} key={id}>
                {CELL_ORDER.map((cell, cellIndex) => (
                  <div key={cell.key}>
                    {renderPendingCell(
                      cellIndex,
                      shouldAnimate,
                      cell.type === "card",
                    )}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className={styles.infoGridRow} key={id}>
              {CELL_ORDER.map((cell, cellIndex) => {
                const revealIndex = isNewestRow ? cellIndex : 0;

                if (cell.type === "card") {
                  const content = renderCardCell(
                    row.card,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                        true,
                      )}
                    </div>
                  );
                }

                if (cell.type === "colors") {
                  const content = renderColorsCell(
                    row.colors as InfoCell,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                      )}
                    </div>
                  );
                }

                if (cell.type === "set") {
                  const content = renderSetCell(
                    row.set,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                      )}
                    </div>
                  );
                }

                if (cell.type === "supplemental") {
                  const content = renderSupplementalInfoCell(
                    row.supplemental_info,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                      )}
                    </div>
                  );
                }

                if (cell.type === "mana_value") {
                  const content = renderManaValueCell(
                    row.mana_value,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                      )}
                    </div>
                  );
                }

                if (cell.type === "rarity") {
                  const content = renderRarityCell(
                    row.rarity,
                    revealIndex,
                    shouldAnimate,
                  );

                  return (
                    <div key={cell.key}>
                      {renderAnimatedCell(
                        content,
                        cellIndex,
                        shouldAnimate,
                        canFlip,
                      )}
                    </div>
                  );
                }

                const content = renderInfoCell(
                  row[cell.key] as InfoCell,
                  revealIndex,
                  shouldAnimate,
                  cell.key,
                );

                return (
                  <div key={cell.key}>
                    {renderAnimatedCell(
                      content,
                      cellIndex,
                      shouldAnimate,
                      canFlip,
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
