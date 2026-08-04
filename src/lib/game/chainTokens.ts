// Pure chain helpers, safe to import from client components, API routes and
// scripts alike. Nothing here may touch the database: chainPuzzles.ts imports
// db.ts, which throws at module load when DATABASE_URL is unset.

export const CHAIN_MODE = "chain-link";
export const CHAIN_ROW_COUNT = 6;
// Row 0 is revealed for free as the seed, so this is how many rows a player
// actually solves, and therefore the score range.
export const CHAIN_SOLVABLE_ROW_COUNT = CHAIN_ROW_COUNT - 1;

// Chain mode has no single winning card, so completions are recorded against a
// fixed placeholder oracle id, the same way salt score does it.
export const CHAIN_ORACLE_ID = "chain-link-daily";

// What the browser is allowed to know about a row it has not solved: how long
// the word is and which leading letters have been revealed so far.
export type ChainPublicRow = {
  position: number;
  length: number;
  revealed: number;
  prefix: string;
};

/**
 * Used for link validation at import time and guess matching at play time. If
 * those two ever disagree a puzzle becomes unsolvable, so everything funnels
 * through this one function.
 */
export function normalizeChainToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function getChainLinkName(left: string, right: string): string {
  return `${left} ${right}`;
}

/** Clamps a client-reported reveal count into the range the token allows. */
export function clampRevealed(token: string, value: unknown): number {
  const revealed =
    typeof value === "number" && Number.isInteger(value) ? value : 1;

  return Math.min(Math.max(revealed, 1), token.length);
}

export function toPublicRow(
  position: number,
  token: string,
  revealed: number,
): ChainPublicRow {
  const safeRevealed = clampRevealed(token, revealed);

  return {
    position,
    length: token.length,
    revealed: safeRevealed,
    prefix: token.slice(0, safeRevealed),
  };
}
