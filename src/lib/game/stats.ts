export type GuessStatBucket = {
  guesses: number;
  players: number;
  share: number;
  barWidth: number;
};

export type GuessStats = {
  solvedCount: number;
  averageGuesses: number | null;
  distribution: GuessStatBucket[];
};

export type GameMode = "classic" | "art";

const PLAYER_ID_STORAGE_KEY = "mtgdle-player-id";

export function getPlayerId(): string {
  const fallbackId = () => crypto.randomUUID();

  try {
    const storedId = window.localStorage.getItem(PLAYER_ID_STORAGE_KEY);

    if (storedId) {
      return storedId;
    }

    const newId = fallbackId();
    window.localStorage.setItem(PLAYER_ID_STORAGE_KEY, newId);

    return newId;
  } catch {
    return fallbackId();
  }
}

export async function recordGameCompletion(
  timezone: string,
  oracleId: string,
  guessesUsed: number,
  mode: GameMode = "classic",
): Promise<GuessStats> {
  const res = await fetch("/api/game/stats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timezone,
      oracleId,
      guessesUsed,
      playerId: getPlayerId(),
      mode,
    }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to record game stats: ${res.status} ${message}`);
  }

  return res.json();
}

export async function fetchGameStats(
  timezone: string,
  mode: GameMode = "classic",
): Promise<GuessStats> {
  const params = new URLSearchParams({ timezone, mode });
  const res = await fetch(`/api/game/stats?${params.toString()}`);

  if (!res.ok) {
    const message = await res.text();
    throw new Error(`Failed to fetch game stats: ${res.status} ${message}`);
  }

  return res.json();
}
