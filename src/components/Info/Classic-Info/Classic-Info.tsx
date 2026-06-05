"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Classic-Info.module.css";
import {
  ChartColumnDecreasing,
  CircleQuestionMark,
  Info,
  X,
} from "lucide-react";
import TutorialSection from "@/components/Sections/Classic-How-To/Tutorial-Section";
import ClassicInfo from "@/components/Sections/Classic-Info/ClassicInfo";
import Stats from "@/components/Sections/Stats/Stats";
import { fetchGameStats, type GuessStats } from "@/lib/game/stats";

type InfoWindow = "stats" | "how-to-play" | "disclaimers" | null;

export default function ClassicInfoBar() {
  const [openWindow, setOpenWindow] = useState<InfoWindow>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<GuessStats | null>(null);
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
      const hasCachedStats = stats !== null;

      if (!hasCachedStats) {
        setStatsLoading(true);
      }

      setStatsError(null);

      try {
        const latestStats = await fetchGameStats(timezone);

        if (!cancelled) {
          setStats(latestStats);
        }
      } catch (error) {
        console.error("Could not load game stats:", error);

        if (!cancelled) {
          if (!hasCachedStats) {
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
  }, [openWindow, timezone, stats]);

  return (
    <div className={styles.container} ref={containerRef}>
      <ul className={styles.info}>
        <li>
          <button
            type="button"
            aria-label="Stats"
            onClick={() => toggleWindow("stats")}
            className={styles.iconButton}
          >
            <ChartColumnDecreasing />
          </button>
        </li>

        <li>
          <button
            type="button"
            aria-label="How To Play"
            onClick={() => toggleWindow("how-to-play")}
            className={styles.iconButton}
          >
            <CircleQuestionMark />
          </button>
        </li>

        <li>
          <button
            type="button"
            aria-label="Disclaimers"
            onClick={() => toggleWindow("disclaimers")}
            className={styles.iconButton}
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
              <div>
                <Stats
                  stats={stats}
                  statsLoading={statsLoading}
                  statsError={statsError}
                />
              </div>
            )}

            {openWindow === "how-to-play" && <TutorialSection />}

            {openWindow === "disclaimers" && <ClassicInfo />}
          </div>
        </div>
      )}
    </div>
  );
}
