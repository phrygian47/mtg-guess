"use client";
import type { Card } from "@/lib/scryfall/types";
import styles from "./page.module.css";
import { useEffect, useState } from "react";
import {
  FIELD_OPTIONS,
  VALUE_OPTIONS,
  OPERATOR_OPTIONS,
  FIELD_OPERATOR_COMPATIBILITY,
  NUMERIC_FIELDS,
} from "@/lib/question/options";
import { OptionItem, QuestionField } from "@/lib/question/types";
import { formatPrettyQuestion } from "@/lib/question/prettyQuestionBuilder";

export default function Home() {
  const [data, setData] = useState<Card | null>(null);
  const [guessesRemaining, setGuessesRemaining] = useState(5);
  const [cardInfo, setCardInfo] = useState<string[] | null>(null);
  const [selectedField, setSelectedField] = useState<QuestionField | "">("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const availableValues =
    selectedField === "" ? [] : (VALUE_OPTIONS[selectedField] ?? []);

  const isNumericField =
    selectedField !== "" && NUMERIC_FIELDS.includes(selectedField);

  const availableOperators =
    selectedField === ""
      ? []
      : OPERATOR_OPTIONS.filter((operator) =>
          FIELD_OPERATOR_COMPATIBILITY[selectedField].includes(operator.value),
        );

  const hasPresetValues = availableValues.length > 0;

  const selectedFieldLabel =
    FIELD_OPTIONS.find((o) => o.value === selectedField)?.label ?? "";

  const selectedOperatorLabel =
    availableOperators.find((o) => o.value === selectedOperator)?.label ?? "";

  const selectedValueLabel = hasPresetValues
    ? (availableValues.find((o) => o.value === selectedValue)?.label ?? "")
    : selectedValue;

  const prettyQuestion = formatPrettyQuestion({
    field: selectedField,
    operator: selectedOperator,
    value: selectedValue,
    fieldLabel: selectedFieldLabel,
    operatorLabel: selectedOperatorLabel,
    valueLabel: selectedValueLabel,
  });

  const submitGuess = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const guess = formData.get("guess") as string;

    console.log("Guess submitted:", guess);
    setGuessesRemaining((prev) => prev - 1);
  };

  const askQuestion = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("Question asked:", selectedField);
    console.log("Operator:", selectedOperator);
    console.log("Value:", selectedValue);
    console.log("Pretty:", prettyQuestion);
  };

  const fetchCard = async () => {
    const res = await fetch("/api/fetch-card");
    const card: Card = await res.json();
    setData(card);
  };

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await fetch("/api/fetch-card");
        if (!res.ok) {
          throw new Error("Failed to fetch card");
        }

        const card: Card = await res.json();
        setData(card);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Guess the Card!</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <p>Name: {data?.name ?? "No card loaded"}</p>
        )}
        <p>Number of Guesses Remaining: {guessesRemaining}</p>
        <ul>
          {cardInfo ? (
            cardInfo.map((info) => <li key={info}>{info}</li>)
          ) : (
            <p>Your guesses will go here</p>
          )}
        </ul>
        <form className={styles.form} onSubmit={askQuestion}>
          <select
            id="ask"
            name="ask"
            className={styles.input}
            value={selectedField}
            onChange={(e) => {
              const newField = e.target.value as QuestionField;
              setSelectedField(newField);
              setSelectedOperator("");
              setSelectedValue("");
            }}
          >
            <option value="" disabled>
              Ask a question about the card
            </option>

            {FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            id="operator"
            name="operator"
            className={styles.input}
            value={selectedOperator}
            onChange={(e) => setSelectedOperator(e.target.value)}
            disabled={!selectedField}
          >
            <option value="" disabled>
              Choose an operator
            </option>

            {availableOperators.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasPresetValues ? (
            <select
              id="value"
              name="value"
              className={styles.input}
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              disabled={!selectedField}
            >
              <option value="" disabled>
                Choose a value
              </option>
              {availableValues.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : isNumericField ? (
            <input
              id="value"
              name="value"
              type="number"
              className={styles.input}
              placeholder="Enter a number"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              disabled={!selectedField}
            />
          ) : (
            <input
              id="value"
              name="value"
              type="text"
              className={styles.input}
              placeholder="Enter a value"
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              disabled={!selectedField}
            />
          )}
          <button type="submit" className={styles.button}>
            Ask
          </button>
        </form>
        <div className={styles.prettyQuestion}>
          <p>{prettyQuestion}</p>
        </div>
        <form id="guess-form" className={styles.form} onSubmit={submitGuess}>
          <input
            id="guess"
            name="guess"
            type="text"
            aria-label="Search for a card"
            placeholder="Search for a card:"
            className={styles.input}
          />
          <button
            type="submit"
            className={styles.button}
            disabled={guessesRemaining <= 0}
          >
            Guess
          </button>
        </form>

        {/* <button onClick={fetchCard}>Fetch a Card!</button>
        <h2>Here is some info about the card:</h2>
        <p>Name: {data?.name ?? "No card loaded yet"}</p>
        <p>Released At: {data?.released_at ?? "N/A"}</p>
        <p>Layout: {data?.layout ?? "N/A"}</p>
        <p>Mana Cost: {data?.mana_cost ?? "N/A"}</p>
        <p>CMC: {data?.cmc ?? "N/A"}</p>
        <p>Type Line: {data?.type_line ?? "N/A"}</p>
        <p>Oracle Text: {data?.oracle_text ?? "N/A"}</p>
        <p>Colors: {data?.colors?.join(", ") ?? "N/A"}</p>
        <p>Color Identity: {data?.color_identity?.join(", ") ?? "N/A"}</p>
        <p>Keywords: {data?.keywords?.join(", ") ?? "N/A"}</p>
        <p>Produced Mana: {data?.produced_mana?.join(", ") ?? "N/A"}</p>
        <p>Power: {data?.power ?? "N/A"}</p>
        <p>Toughness: {data?.toughness ?? "N/A"}</p>
        <p>Flavor Text: {data?.flavor_text ?? "N/A"}</p> */}
      </main>
    </div>
  );
}
