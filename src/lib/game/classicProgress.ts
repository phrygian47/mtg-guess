import type { InfoGridRow } from "@/lib/game/types";
import type { GuessStats } from "@/lib/game/stats";

export type ClassicDisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

export type ClassicProgressInput = {
  rows: ClassicDisplayInfoGridRow[];
  completed: boolean;
  winningCardName: string | null;
  winningCardImage: string | null;
  winningOracleId: string | null;
  completionRecorded: boolean;
  stats: GuessStats | null;
};

export type ClassicProgress = ClassicProgressInput & {
  version: 1;
  mode: "classic";
  puzzleDate: string;
  timezone: string;
  updatedAt: number;
};

const STORAGE_KEY_PREFIX = "mtgdle-classic-progress-v1";

export function getClassicPuzzleDate(timezone: string): string {
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

export function loadClassicProgress(timezone: string): ClassicProgress | null {
  const puzzleDate = getClassicPuzzleDate(timezone);

  try {
    pruneOldClassicProgress(puzzleDate);

    const rawProgress = window.localStorage.getItem(getStorageKey(puzzleDate));

    if (!rawProgress) {
      return null;
    }

    const progress = JSON.parse(rawProgress) as unknown;

    if (!isClassicProgress(progress) || progress.puzzleDate !== puzzleDate) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

export function saveClassicProgress(
  timezone: string,
  input: ClassicProgressInput,
): ClassicProgress | null {
  const puzzleDate = getClassicPuzzleDate(timezone);
  const progress: ClassicProgress = {
    ...input,
    version: 1,
    mode: "classic",
    puzzleDate,
    timezone,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      getStorageKey(puzzleDate),
      JSON.stringify(progress),
    );

    pruneOldClassicProgress(puzzleDate);

    return progress;
  } catch {
    return null;
  }
}

function getStorageKey(puzzleDate: string): string {
  return `${STORAGE_KEY_PREFIX}:${puzzleDate}`;
}

function pruneOldClassicProgress(currentPuzzleDate: string) {
  const currentKey = getStorageKey(currentPuzzleDate);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (
      key &&
      key.startsWith(`${STORAGE_KEY_PREFIX}:`) &&
      key !== currentKey
    ) {
      window.localStorage.removeItem(key);
    }
  }
}

function isClassicProgress(value: unknown): value is ClassicProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<ClassicProgress>;

  return (
    progress.version === 1 &&
    progress.mode === "classic" &&
    typeof progress.puzzleDate === "string" &&
    typeof progress.timezone === "string" &&
    Array.isArray(progress.rows) &&
    typeof progress.completed === "boolean" &&
    typeof progress.completionRecorded === "boolean" &&
    typeof progress.updatedAt === "number"
  );
}
