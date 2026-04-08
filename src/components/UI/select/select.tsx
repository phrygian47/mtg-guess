"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./select.module.css";

export type Option = {
  label: string;
  value: string;
};

type SelectProps = {
  options: Option[];
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function Select({
  options,
  label,
  value,
  onChange,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelect(option: Option) {
    onChange(option.value);
    setIsOpen(false);
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <label className={styles.label}>{label}</label>

      <button
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selected ? selected.label : "Select an option"}</span>
        <span className={`${styles.arrow} ${isOpen ? styles.open : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <ul className={styles.menu}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`${styles.option} ${
                  selected?.value === option.value ? styles.selected : ""
                }`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
