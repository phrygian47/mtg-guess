"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./GameNav.module.css";
import { ClassicIcon } from "@/assets/icons/classic";
import { Palette, Stone } from "lucide-react";

export default function GameNav() {
  const pathname = usePathname();
  const isClassic = pathname === "/classic";
  const isArt = pathname === "/art";
  const isSalt = pathname === "/salt-score";

  if (!isClassic && !isArt && !isSalt) {
    return null;
  }

  return (
    <div className={styles.navMain}>
      <nav>
        <ul className={styles.nav}>
          <li>
            <Link
              href="/classic"
              className={`${styles.modeLink} ${isClassic ? styles.active : ""}`}
              aria-current={isClassic ? "page" : undefined}
              aria-label="Classic game mode"
              title="Classic"
            >
              <i className={styles.iconContainer}>
                <ClassicIcon className={styles.icon} />
              </i>
            </Link>
          </li>

          <li>
            <Link
              href="/art"
              className={`${styles.modeLink} ${isArt ? styles.active : ""}`}
              aria-current={isArt ? "page" : undefined}
              aria-label="Pixelated art game mode"
              title="Art"
            >
              <i className={styles.iconContainer}>
                <Palette className={styles.icon} />
              </i>
            </Link>
          </li>

          <li>
            <Link
              href="/salt-score"
              className={`${styles.modeLink} ${isSalt ? styles.active : ""}`}
              aria-current={isSalt ? "page" : undefined}
              aria-label="Salt score game mode"
              title="Salt Score"
            >
              <i className={styles.iconContainer}>
                <Stone className={styles.icon} />
              </i>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
