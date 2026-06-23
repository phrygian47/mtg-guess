import { useEffect, useRef, type RefObject } from "react";

type VictoryScrollOptions = {
  offsetPx?: number;
  durationMs?: number;
};

const DEFAULT_SCROLL_OFFSET_PX = 32;
const DEFAULT_SCROLL_DURATION_MS = 700;

function easeOutCubic(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

export function useVictoryScroll<T extends HTMLElement>(
  active: boolean,
  {
    offsetPx = DEFAULT_SCROLL_OFFSET_PX,
    durationMs = DEFAULT_SCROLL_DURATION_MS,
  }: VictoryScrollOptions = {},
): RefObject<T | null> {
  const targetRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    let frameId: number | null = null;

    const startScroll = () => {
      const element = targetRef.current;
      if (!element) return;

      const startY = window.scrollY;
      const targetY = Math.max(
        0,
        startY + element.getBoundingClientRect().top - offsetPx,
      );
      const distance = targetY - startY;

      if (durationMs <= 0) {
        window.scrollTo(0, targetY);
        return;
      }

      const startedAt = window.performance.now();

      const step = (timestamp: number) => {
        const elapsed = timestamp - startedAt;
        const progress = Math.min(elapsed / durationMs, 1);
        const nextY = startY + distance * easeOutCubic(progress);

        window.scrollTo(0, nextY);

        if (progress < 1) {
          frameId = window.requestAnimationFrame(step);
        }
      };

      frameId = window.requestAnimationFrame(step);
    };

    frameId = window.requestAnimationFrame(startScroll);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [active, durationMs, offsetPx]);

  return targetRef;
}
