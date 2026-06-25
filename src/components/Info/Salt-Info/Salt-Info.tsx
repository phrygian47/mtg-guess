"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChartColumnDecreasing,
  CircleQuestionMark,
  Info,
  X,
} from "lucide-react";

import SaltTutorialSection from "@/components/Sections/Salt-How-To/SaltTutorialSection";
import SaltInfo from "@/components/Sections/Salt-Info/SaltInfo";

import styles from "./Salt-Info.module.css";

type InfoWindow = "stats" | "how-to-play" | "disclaimers" | null;

export default function SaltInfoBar() {
  const [openWindow, setOpenWindow] = useState<InfoWindow>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
              <div className={styles.placeholderPanel} aria-live="polite">
                <h3>Today&apos;s Results</h3>
                <p>
                  Salt Score stats will appear here once scoring is wired up.
                </p>
              </div>
            )}

            {openWindow === "how-to-play" && <SaltTutorialSection />}

            {openWindow === "disclaimers" && <SaltInfo />}
          </div>
        </div>
      )}
    </div>
  );
}
