import type { GameMode } from "@/lib/game/stats";

// Pure mode helpers, shared by the API routes. No database access here.

export const GAME_MODES: GameMode[] = [
  "classic",
  "art",
  "salt-score",
  "chain-link",
];

/**
 * Validates a `[mode]` path segment. Returns null rather than defaulting, so
 * an unknown mode 404s instead of silently serving classic.
 */
export function normalizePuzzleMode(value: unknown): GameMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const mode = value.trim() as GameMode;

  return GAME_MODES.includes(mode) ? mode : null;
}
