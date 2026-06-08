import type { GuessStats } from "@/lib/game/stats";

export type ArtGuessProgress = {
  id: string;
  name: string;
  correct: boolean;
};

export type ArtProgressInput = {
  guesses: ArtGuessProgress[];
  completed: boolean;
  winningCardName: string | null;
  winningCardImage: string | null;
  winningOracleId: string | null;
  completionRecorded: boolean;
  stats: GuessStats | null;
  setNameHint: string | null;
  manaCostHint: string | null;
  rulesTextHint: string | null;
};

export type ArtProgress = ArtProgressInput & {
  version: 1;
  mode: "art";
  puzzleDate: string;
  timezone: string;
  updatedAt: number;
};

const STORAGE_KEY_PREFIX = "mtgdle-art-progress-v1";

export function getArtPuzzleDate(timezone: string): string {
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

export function loadArtProgress(timezone: string): ArtProgress | null {
  const puzzleDate = getArtPuzzleDate(timezone);

  try {
    pruneOldArtProgress(puzzleDate);

    const rawProgress = window.localStorage.getItem(getStorageKey(puzzleDate));

    if (!rawProgress) {
      return null;
    }

    const progress = JSON.parse(rawProgress) as unknown;

    if (!isArtProgress(progress) || progress.puzzleDate !== puzzleDate) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

export function saveArtProgress(
  timezone: string,
  input: ArtProgressInput,
): ArtProgress | null {
  const puzzleDate = getArtPuzzleDate(timezone);
  const progress: ArtProgress = {
    ...input,
    version: 1,
    mode: "art",
    puzzleDate,
    timezone,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      getStorageKey(puzzleDate),
      JSON.stringify(progress),
    );

    pruneOldArtProgress(puzzleDate);

    return progress;
  } catch {
    return null;
  }
}

function getStorageKey(puzzleDate: string): string {
  return `${STORAGE_KEY_PREFIX}:${puzzleDate}`;
}

function pruneOldArtProgress(currentPuzzleDate: string) {
  const currentKey = getStorageKey(currentPuzzleDate);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(`${STORAGE_KEY_PREFIX}:`) && key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  }
}

function isArtProgress(value: unknown): value is ArtProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<ArtProgress>;

  return (
    progress.version === 1 &&
    progress.mode === "art" &&
    typeof progress.puzzleDate === "string" &&
    typeof progress.timezone === "string" &&
    Array.isArray(progress.guesses) &&
    typeof progress.completed === "boolean" &&
    typeof progress.completionRecorded === "boolean" &&
    typeof progress.updatedAt === "number"
  );
}
