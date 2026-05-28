// src/lib/game/useNextPuzzleCountdown.ts
import { useEffect, useState } from "react";

type CountdownParts = {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function getNextLocalMidnight(): number {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  ).getTime();
}

function getCountdownParts(): CountdownParts {
  const nowMs = Date.now();
  const nextResetMs = getNextLocalMidnight();
  const totalMs = Math.max(0, nextResetMs - nowMs);

  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs,
  };
}

export function useNextPuzzleCountdown(): CountdownParts {
  const [countdown, setCountdown] = useState<CountdownParts>(() =>
    getCountdownParts(),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdown(getCountdownParts());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return countdown;
}

export function formatCountdown({
  hours,
  minutes,
  seconds,
}: CountdownParts): string {
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}
