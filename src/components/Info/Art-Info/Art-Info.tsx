"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartColumnDecreasing,
  CircleQuestionMark,
  Info,
  X,
} from "lucide-react";

import styles from "./Art-Info.module.css";
import ArtTutorialSection from "@/components/Sections/Art-How-To/ArtTutorialSection";
import ArtInfo from "@/components/Sections/Art-Info/ArtInfo";
import Stats from "@/components/Sections/Stats/Stats";
import { fetchGameStats, type GuessStats } from "@/lib/game/stats";

type InfoWindow = "stats" | "how-to-play" | "disclaimers" | null;

export default function ArtInfoBar() {
  const [openWindow, setOpenWindow] = useState<InfoWindow>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GuessStats | null>(null);
  const statsRef = useRef<GuessStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const toggleWindow = (windowName: InfoWindow) => {
    setOpenWindow((prev) => (prev === windowName ? null : windowName));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenWindow(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (openWindow !== "stats") return;

    let cancelled = false;

    async function loadStats() {
      const hasCachedStats = statsRef.current !== null;

      if (!hasCachedStats) {
        setStatsLoading(true);
      }

      setStatsError(null);

      try {
        const latestStats = await fetchGameStats(timezone, "art");

        if (!cancelled) {
          statsRef.current = latestStats;
          setStats(latestStats);
        }
      } catch (error) {
        console.error("Could not load art stats:", error);

        if (!cancelled) {
          if (!hasCachedStats) {
            statsRef.current = null;
            setStats(null);
          }

          setStatsError("Stats are unavailable right now.");
        }
      } finally {
        if (!cancelled && !hasCachedStats) {
          setStatsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [openWindow, timezone]);

  return (
    <div className={styles.container} ref={containerRef}>
      <ul className={styles.info}>
        <li>
          <button
            type="button"
            aria-label="Stats"
            data-tooltip="Stats"
            onClick={() => toggleWindow("stats")}
            className={`${styles.iconButton} ${styles.tooltipButton}`}
          >
            <ChartColumnDecreasing />
          </button>
        </li>

        <li>
          <button
            type="button"
            aria-label="How To"
            data-tooltip="How To"
            onClick={() => toggleWindow("how-to-play")}
            className={`${styles.iconButton} ${styles.tooltipButton}`}
          >
            <CircleQuestionMark />
          </button>
        </li>

        <li>
          <button
            type="button"
            aria-label="Other Info"
            data-tooltip="Other Info"
            onClick={() => toggleWindow("disclaimers")}
            className={`${styles.iconButton} ${styles.tooltipButton}`}
          >
            <Info />
          </button>
        </li>
      </ul>

      {openWindow && (
        <div className={styles.window}>
          <div className={styles.windowBody}>
            <div className={styles.exit_btn}>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpenWindow(null)}
                className={styles.closeButton}
              >
                <X size={16} />
              </button>
            </div>

            {openWindow === "stats" && (
              <Stats
                stats={stats}
                statsLoading={statsLoading}
                statsError={statsError}
              />
            )}

            {openWindow === "how-to-play" && <ArtTutorialSection />}

            {openWindow === "disclaimers" && <ArtInfo />}
          </div>
        </div>
      )}
    </div>
  );
}
