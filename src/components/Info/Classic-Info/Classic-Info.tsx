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

type InfoWindow = "stats" | "how-to-play" | "disclaimers" | null;

export default function ClassicInfo() {
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
          <div className={styles.windowHeader}>
            <h3 className={styles.windowTitle}>
              {openWindow === "stats" && "Stats"}
              {openWindow === "how-to-play" && "How to Play"}
              {openWindow === "disclaimers" && "About the Data"}
            </h3>

            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpenWindow(null)}
              className={styles.closeButton}
            >
              <X size={16} />
            </button>
          </div>

          <div className={styles.windowBody}>
            {openWindow === "stats" && <p>Put your stats content here.</p>}

            {openWindow === "how-to-play" && <TutorialSection />}

            {openWindow === "disclaimers" && (
              <p>
                Some tags are derived from community tagging data and may be
                incomplete or inconsistent.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
