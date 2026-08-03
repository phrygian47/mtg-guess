import Image from "next/image";
import type { CSSProperties } from "react";

import styles from "./ManaSpinner.module.css";

// Clockwise around the color pie, so allied colors sit next to each other.
const COLOR_WHEEL = [
  { code: "w", glow: "#f6efc9" },
  { code: "u", glow: "#4d9de0" },
  { code: "b", glow: "#9a72c4" },
  { code: "r", glow: "#e0563a" },
  { code: "g", glow: "#4fae63" },
];

const CYCLE_MS = 1500;

type ManaSpinnerProps = {
  size?: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
};

export default function ManaSpinner({
  size = 96,
  label = "Loading...",
  showLabel = true,
  className,
}: ManaSpinnerProps) {
  const symbolSize = Math.round(size * 0.28);

  return (
    <div
      className={className ? `${styles.spinner} ${className}` : styles.spinner}
      role="status"
    >
      <div
        className={styles.wheel}
        style={
          {
            "--wheel-size": `${size}px`,
            "--symbol-size": `${symbolSize}px`,
            "--cycle": `${CYCLE_MS}ms`,
          } as CSSProperties
        }
      >
        {COLOR_WHEEL.map((color, index) => (
          <span
            key={color.code}
            className={styles.symbol}
            style={
              {
                "--angle": `${(index * 360) / COLOR_WHEEL.length}deg`,
                "--glow": color.glow,
                "--delay": `${(index * CYCLE_MS) / COLOR_WHEEL.length}ms`,
              } as CSSProperties
            }
          >
            <Image
              src={`/card-symbols/sym-${color.code}.svg`}
              alt=""
              aria-hidden="true"
              width={symbolSize}
              height={symbolSize}
              loading="eager"
            />
          </span>
        ))}
      </div>
      {showLabel ? (
        <p className={styles.label}>{label}</p>
      ) : (
        <span className={styles.srOnly}>{label}</span>
      )}
    </div>
  );
}
