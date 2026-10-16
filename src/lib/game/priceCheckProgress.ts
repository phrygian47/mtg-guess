export type PriceCheckRound = {
  chosen: "left" | "right";
  correct: boolean;
  leftCents: number;
  rightCents: number;
};

export type PriceCheckProgressInput = {
  rounds: PriceCheckRound[];
  currentRound: number;
  completed: boolean;
};

export type PriceCheckProgress = PriceCheckProgressInput & {
  version: 1;
  mode: "price-check";
  puzzleDate: string;
  timezone: string;
  updatedAt: number;
};

const STORAGE_KEY_PREFIX = "mtgdle-price-check-progress-v1";

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function getPriceCheckPuzzleDate(timezone: string): string {
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

export function loadPriceCheckProgress(
  timezone: string,
): PriceCheckProgress | null {
  const puzzleDate = getPriceCheckPuzzleDate(timezone);

  try {
    pruneOldPriceCheckProgress(puzzleDate);

    const rawProgress = window.localStorage.getItem(getStorageKey(puzzleDate));

    if (!rawProgress) {
      return null;
    }

    const progress = JSON.parse(rawProgress) as unknown;

    if (!isPriceCheckProgress(progress) || progress.puzzleDate !== puzzleDate) {
      return null;
    }

    return progress;
  } catch {
    return null;
  }
}

export function savePriceCheckProgress(
  timezone: string,
  input: PriceCheckProgressInput,
): PriceCheckProgress | null {
  const puzzleDate = getPriceCheckPuzzleDate(timezone);
  const progress: PriceCheckProgress = {
    ...input,
    version: 1,
    mode: "price-check",
    puzzleDate,
    timezone,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem(
      getStorageKey(puzzleDate),
      JSON.stringify(progress),
    );

    pruneOldPriceCheckProgress(puzzleDate);

    return progress;
  } catch {
    return null;
  }
}

function getStorageKey(puzzleDate: string): string {
  return `${STORAGE_KEY_PREFIX}:${puzzleDate}`;
}

function pruneOldPriceCheckProgress(currentPuzzleDate: string) {
  const currentKey = getStorageKey(currentPuzzleDate);

  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(`${STORAGE_KEY_PREFIX}:`) && key !== currentKey) {
      window.localStorage.removeItem(key);
    }
  }
}

function isPriceCheckRound(value: unknown): value is PriceCheckRound {
  if (!value || typeof value !== "object") {
    return false;
  }

  const round = value as Partial<PriceCheckRound>;

  return (
    (round.chosen === "left" || round.chosen === "right") &&
    typeof round.correct === "boolean" &&
    typeof round.leftCents === "number" &&
    typeof round.rightCents === "number"
  );
}

function isPriceCheckProgress(value: unknown): value is PriceCheckProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const progress = value as Partial<PriceCheckProgress>;

  return (
    progress.version === 1 &&
    progress.mode === "price-check" &&
    typeof progress.puzzleDate === "string" &&
    typeof progress.timezone === "string" &&
    Array.isArray(progress.rounds) &&
    progress.rounds.every(isPriceCheckRound) &&
    typeof progress.currentRound === "number" &&
    typeof progress.completed === "boolean" &&
    typeof progress.updatedAt === "number"
  );
}
