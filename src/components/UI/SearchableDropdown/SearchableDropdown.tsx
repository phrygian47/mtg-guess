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

export interface SearchableDropdownProps<T> {
  fetchOptions: (query: string) => Promise<T[]>;
  displayValue: (item: T) => string;
  renderOption?: (item: T) => React.ReactNode;
  placeholder?: string;
  minQueryLength?: number;
}

const SearchableDropdown = React.forwardRef(
  <T,>(
    {
      fetchOptions,
      displayValue,
      renderOption,
      placeholder = "Search...",
      minQueryLength = 2,
    }: SearchableDropdownProps<T>,
    ref: React.ForwardedRef<HTMLInputElement>,
  ) => {
    // 🧠 State
    const [query, setQuery] = useState("");
    const [options, setOptions] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // ⏳ Debounce
    const debouncedQuery = useDebounce(query, 300);

    useEffect(() => {
      if (debouncedQuery.trim().length < minQueryLength) {
        setOptions([]);
        setShowDropdown(false);
        setFocusedIndex(-1);
        return;
      }

      let isActive = true;

      const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
          const results = await fetchOptions(debouncedQuery.trim());
          if (!isActive) return;

          setOptions(results || []);
          setShowDropdown(true);
        } catch (err: any) {
          if (!isActive) return;

          setError(err.message || "Failed to load options");
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
        isActive = false; // prevent race conditions
      };
    }, [debouncedQuery, fetchOptions, minQueryLength]);

    /**
     * 🖱️ Click outside handler
     */
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
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = useCallback(
      (item: T) => {
        setQuery(displayValue(item));
        setShowDropdown(false);
        setOptions([]);
        setFocusedIndex(-1);
      },
      [displayValue],
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
          setFocusedIndex(
            (prev) => (prev - 1 + options.length) % options.length,
          );
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
        return <li className="p-2 text-sm text-gray-500 italic">Loading...</li>;
      }

      if (error) {
        return <li className="p-2 text-sm text-red-500">{error}</li>;
      }

      if (!loading && options.length === 0 && query.length >= minQueryLength) {
        return <li className="p-2 text-sm text-gray-500">No results found</li>;
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
            className={`p-2 cursor-pointer hover:bg-gray-100 ${
              isSelected ? "bg-blue-50" : ""
            } ${index < options.length - 1 ? "border-b border-gray-100" : ""}`}
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
      query,
      renderOption,
      displayValue,
      handleSelect,
      minQueryLength,
    ]);

    /**
     * 🖼️ UI
     */
    return (
      <div className="w-72 relative" ref={dropdownRef}>
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.length >= minQueryLength && options.length > 0) {
              setShowDropdown(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="dropdown-listbox"
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        {showDropdown && (
          <ul
            id="dropdown-listbox"
            role="listbox"
            aria-label="Search results"
            className="absolute top-11 left-0 right-0 bg-white border border-gray-300 rounded-md shadow-md max-h-48 overflow-y-auto z-10"
          >
            {renderedOptions}
          </ul>
        )}
      </div>
    );
  },
);

/**
 * 🏷️ DevTools name
 */
SearchableDropdown.displayName = "SearchableDropdown";

export default SearchableDropdown;
