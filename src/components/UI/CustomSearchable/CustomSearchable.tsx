import styles from "./CustomSearchable.module.css";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export interface CustomSearchableProps<T> {
  fetchOptions: (query: string) => Promise<T[]>;
  displayValue: (item: T) => string;
  renderOption?: (item: T) => React.ReactNode;
  placeholder?: string;
  minQueryLength?: number;
  onSelect?: (item: T | null) => void;
  name?: string;
  id?: string;
  clearSignal?: number;
}

function SearchableDropdownInner<T>(
  {
    fetchOptions,
    displayValue,
    renderOption,
    placeholder = "Search...",
    minQueryLength = 2,
    onSelect,
    name,
    id,
    clearSignal,
  }: CustomSearchableProps<T>,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedDisplayValueRef = useRef<string | null>(null);

  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    selectedDisplayValueRef.current = null;

    /* eslint-disable react-hooks/set-state-in-effect */
    setQuery("");
    setOptions([]);
    setShowDropdown(false);
    setFocusedIndex(-1);
    setError(null);
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [clearSignal]);

  useEffect(() => {
    const trimmedQuery = debouncedQuery.trim();

    if (trimmedQuery.length < minQueryLength) {
      return;
    }

    let isActive = true;

    const fetchData = async () => {
      try {
        const results = await fetchOptions(trimmedQuery);
        if (!isActive) return;

        setOptions(results || []);
      } catch {
        if (!isActive) return;

        setError("Failed to load options");
        setOptions([]);
      } finally {
        if (isActive) {
          setLoading(false);
          setFocusedIndex(-1);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [debouncedQuery, fetchOptions, minQueryLength]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (item: T) => {
      const label = displayValue(item);

      selectedDisplayValueRef.current = label;

      setQuery(label);
      setShowDropdown(false);
      setOptions([]);
      setFocusedIndex(-1);

      onSelect?.(item);
    },
    [displayValue, onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || options.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % options.length);
        break;

      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
        break;

      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelect(options[focusedIndex]);
        }
        break;

      case "Escape":
        setShowDropdown(false);
        break;
    }
  };

  const renderedOptions = useMemo(() => {
    if (loading) {
      return (
        <li className={`${styles.searchable_message} ${styles.italic}`}>
          Loading...
        </li>
      );
    }

    if (error) {
      return <li className={styles.searchable_error}>{error}</li>;
    }

    if (
      !loading &&
      options.length === 0 &&
      debouncedQuery.trim().length >= minQueryLength
    ) {
      return <li className={styles.searchable_message}>No results found</li>;
    }

    return options.map((option, index) => {
      const isSelected = index === focusedIndex;

      return (
        <li
          key={index}
          role="option"
          aria-selected={isSelected}
          onClick={() => handleSelect(option)}
          onMouseEnter={() => setFocusedIndex(index)}
          className={
            styles.searchable_option +
            (isSelected ? " " + styles.searchable_option_selected : "") +
            (index < options.length - 1
              ? " " + styles.searchable_option_with_border
              : "")
          }
        >
          {renderOption ? renderOption(option) : displayValue(option)}
        </li>
      );
    });
  }, [
    loading,
    error,
    options,
    focusedIndex,
    debouncedQuery,
    renderOption,
    displayValue,
    handleSelect,
    minQueryLength,
  ]);
  return (
    <div className={styles.searchable_dropdown} ref={dropdownRef}>
      <div className={styles.searchable_container}>
        <div
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls="dropdown-listbox"
        >
          <input
            ref={ref}
            id={id}
            name={name}
            type="text"
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            onChange={(e) => {
              const nextQuery = e.target.value;
              const trimmedNextQuery = nextQuery.trim();

              selectedDisplayValueRef.current = null;
              onSelect?.(null);

              setQuery(nextQuery);
              setFocusedIndex(-1);
              setError(null);

              if (trimmedNextQuery.length < minQueryLength) {
                setOptions([]);
                setShowDropdown(false);
                setLoading(false);
                return;
              }

              setOptions([]);
              setShowDropdown(true);
              setLoading(true);
            }}
            onFocus={() => {
              if (
                query.trim().length >= minQueryLength &&
                (options.length > 0 || loading || error)
              ) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            aria-autocomplete="list"
            aria-controls="dropdown-listbox"
            className={styles.searchable_input}
          />
        </div>

        <button type="submit" className={styles.btn}></button>
      </div>

      {showDropdown && (
        <ul
          id="dropdown-listbox"
          role="listbox"
          aria-label="Search results"
          className={styles.searchable_list}
        >
          {renderedOptions}
        </ul>
      )}
    </div>
  );
}

const CustomSearchable = React.forwardRef(SearchableDropdownInner) as <T>(
  props: CustomSearchableProps<T> & React.RefAttributes<HTMLInputElement>,
) => React.ReactElement | null;

export default CustomSearchable;
