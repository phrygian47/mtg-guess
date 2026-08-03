import type { GuessStats } from "@/lib/game/stats";

export type SaltScoreProgressInput = {
  results: boolean[];
  currentRound: number;
  completed: boolean;
  completionRecorded: boolean;
  stats: GuessStats | null;
};

export type SaltScoreProgress = SaltScoreProgressInput & {
  version: 1;
  mode: "salt-score";
  puzzleDate: string;
  timezone: string;
  updatedAt: number;
};

const STORAGE_KEY_PREFIX = "mtgdle-salt-score-progress-v1";

export const SALT_SCORE_ROUND_COUNT = 5;

// Salt Score has no single winning card, so completions are recorded against a
// fixed placeholder oracle id that the stats route validates.
export const SALT_SCORE_ORACLE_ID = "salt-score-daily";

export function formatSaltScore(score: number): string {
  return `${score}/${SALT_SCORE_ROUND_COUNT} correct`;
}

export function getSaltScorePuzzleDate(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const dateParts = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );

    if (dateParts.year && dateParts.month && dateParts.day) {
      return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    }
  } catch {
    // Fall back to the browser's local date if the timezone is unavailable.
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function loadSaltScoreProgress(
  timezone: string,
): SaltScoreProgress | null {
  const puzzleDate = getSaltScorePuzzleDate(timezone);

  try {
    pruneOldSaltScoreProgress(puzzleDate);

    const rawProgress = window.localStorage.getItem(getStorageKey(puzzleDate));

    if (!rawProgress) {
      return null;
    }

    const progress = JSON.parse(rawProgress) as unknown;

    if (!isSaltScoreProgress(progress) || progress.puzzleDate !== puzzleDate) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

export function saveSaltScoreProgress(
  timezone: string,
  input: SaltScoreProgressInput,
): SaltScoreProgress | null {
  const puzzleDate = getSaltScorePuzzleDate(timezone);
  const progress: SaltScoreProgress = {
    ...input,
    version: 1,
    mode: "salt-score",
    puzzleDate,
    timezone,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      getStorageKey(puzzleDate),
      JSON.stringify(progress),
    );

    pruneOldSaltScoreProgress(puzzleDate);

    return progress;
  } catch {
    return null;
  }
}

function getStorageKey(puzzleDate: string): string {
  return `${STORAGE_KEY_PREFIX}:${puzzleDate}`;
}

function pruneOldSaltScoreProgress(currentPuzzleDate: string) {
  const currentKey = getStorageKey(currentPuzzleDate);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(`${STORAGE_KEY_PREFIX}:`) && key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  }
}

function isSaltScoreProgress(value: unknown): value is SaltScoreProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<SaltScoreProgress>;

  return (
    progress.version === 1 &&
    progress.mode === "salt-score" &&
    typeof progress.puzzleDate === "string" &&
    typeof progress.timezone === "string" &&
    Array.isArray(progress.results) &&
    typeof progress.currentRound === "number" &&
    typeof progress.completed === "boolean" &&
    typeof progress.completionRecorded === "boolean" &&
    typeof progress.updatedAt === "number"
  );
}
