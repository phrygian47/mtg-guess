"use client";
import type { Card } from "@/lib/scryfall/types";
import styles from "./page.module.css";
import { useEffect, useState, useRef, useCallback, Fragment } from "react";
import {
  FIELD_OPTIONS,
  VALUE_OPTIONS,
  OPERATOR_OPTIONS,
  FIELD_OPERATOR_COMPATIBILITY,
  NUMERIC_FIELDS,
} from "@/lib/question/options";
import {
  QuestionField,
  QuestionWithResponse,
  CardGuess,
} from "@/lib/question/types";
import { StartInfo, InfoGridRow } from "@/lib/game/types";
import InfoGrid from "@/components/UI/InfoGrid/InfoGrid";
import { submitGuess } from "@/lib/game/submitGuess";
import { formatPrettyQuestion } from "@/lib/question/prettyQuestionBuilder";
import Select from "@/components/UI/select/select";
import { TextInput } from "@/components/UI/input/input";
import Button from "@/components/UI/button/button";
import CustomSearchable from "@/components/UI/CustomSearchable/CustomSearchable";
import { getAvailableValues } from "@/lib/question/getAvailableValues";
import { requiresValue } from "@/lib/question/requiresValue";
import parseColor from "@/lib/game/parseColor";
import { start } from "repl";
import { submitCard } from "@/lib/game/submitCard";

type DisplayInfoGridRow = {
  id: string;
  row: InfoGridRow;
};

export default function Home() {
  const [card, setCard] = useState<Card | null>(null);
  const [startInfo, setStartInfo] = useState<StartInfo | null>(null);
  const [gameStart, setGameStart] = useState<boolean>(false);
  const [guessesRemaining, setGuessesRemaining] = useState(21);
  const [cardInfo, setCardInfo] = useState<QuestionWithResponse[]>([]);
  const [selectedField, setSelectedField] = useState<QuestionField | "">("");
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cardVisible, setCardVisible] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [infoGrid, setInfoGrid] = useState<DisplayInfoGridRow[]>([]);

  const [selectedGuessCard, setSelectedGuessCard] = useState<string>("");
  const guessInputRef = useRef<HTMLInputElement>(null);

  const availableValues = getAvailableValues(selectedField, selectedOperator);

  const valueIsRequired = requiresValue(selectedField, selectedOperator);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  const handleSubmitGuess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedGuessCard) return;

    try {
      const isCorrect = await submitGuess(timezone, selectedGuessCard);
      const newInfoGridRow = await submitCard(timezone, selectedGuessCard);

      setInfoGrid((prev) => [
        {
          id: crypto.randomUUID(),
          row: newInfoGridRow,
        },
        ...prev,
      ]);

      setGameWon(isCorrect);
      setGuessesRemaining((prev) => prev - 1);
      setSelectedGuessCard("");
    } catch (error) {
      console.error("Could not submit guess:", error);
    }
  };
  // const askQuestion = async (e: React.SubmitEvent<HTMLFormElement>) => {
  //   e.preventDefault();

  //   console.log("Question asked:", selectedField);
  //   console.log("Operator:", selectedOperator);
  //   console.log("Value:", selectedValue);
  //   console.log("Pretty:", prettyQuestion);

  //   const res = await fetch("/api/cards/ask", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //     },
  //     body: JSON.stringify({
  //       field: selectedField,
  //       op: selectedOperator,
  //       value: selectedValue,
  //       label: prettyQuestion,
  //       timezone: timezone,
  //     }),
  //   });

  //   const data = await res.json();
  //   console.log(data);

  //   const newQuestion: QuestionWithResponse = {
  //     answer: data.answer,
  //     label: prettyQuestion,
  //   };
  //   setCardInfo([...cardInfo, newQuestion]);
  //   setGuessesRemaining(guessesRemaining - 1);
  // };

  const fetchCardOptions = useCallback(
    async (query: string): Promise<CardGuess[]> => {
      const res = await fetch(
        `/api/cards/search?q=${encodeURIComponent(query)}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch card options");
      }

      const cards: CardGuess[] = await res.json();
      return cards;
    },
    [],
  );

  useEffect(() => {
    // const loadStartInfo = async () => {
    //   try {
    //     const res = await fetch(
    //       `/api/game/start-game?timezone=${encodeURIComponent(timezone)}`,
    //     );

    //     if (!res.ok) {
    //       const text = await res.text();
    //       throw new Error(`Failed to fetch card ${res.status} ${text}`);
    //     }

    //     const startInfo = await res.json();

    //     setStartInfo(startInfo);

    //     console.log(startInfo);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // };
    const fetchCard = async () => {
      try {
        const res = await fetch(
          `/api/fetch-card?timezone=${encodeURIComponent(timezone)}`,
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch card ${res.status} ${text}`);
        }

        const card: Card = await res.json();
        setCard(card);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
    // loadStartInfo();
  }, []);

  if (gameWon && card) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <section className={styles.victoryScreen}>
            <h1 className={styles.title}>You got it!</h1>

            <p className={styles.victoryText}>
              The card was <strong>{card.name}</strong>.
            </p>

            {card.image_uris?.normal && (
              <img
                src={card.image_uris.normal}
                alt={card.name}
                className={styles.victoryCard}
              />
            )}

            <p>
              You solved it with {guessesRemaining} question
              {guessesRemaining === 1 ? "" : "s"} remaining.
            </p>

            <button
              className={styles.button}
              onClick={() => window.location.reload()}
            >
              Play Again
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1 className={styles.title}>Guess the Card!</h1>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div>
            {!gameStart && (
              <button onClick={() => setGameStart(true)}>
                Start Game (21 Questions)
              </button>
            )}
            <button onClick={() => setCardVisible(!cardVisible)}>
              Toggle Reveal (Testing purposes only)
            </button>
          </div>
        )}
        {cardVisible && <p>{card?.name}</p>}
        {gameStart && startInfo && (
          <div>
            <h3>You have {guessesRemaining} questions left!</h3>
            {/* <p>
              The card is a {parseColor(startInfo.colors).join("/")}{" "}
              {startInfo.type}
            </p> */}
          </div>
        )}
        {cardInfo.length > 0 ? (
          cardInfo.map((info, index) => (
            <div
              key={`${info.label}-${index}`}
              className={styles.questionsHistory}
            >
              <p className={styles.asked}>{info.label}</p>
              <p className={styles.answer}>
                {typeof info.answer === "boolean"
                  ? info.answer
                    ? "Yes"
                    : "No"
                  : String(info.answer)}
              </p>
            </div>
          ))
        ) : (
          <p>Your guesses will go here</p>
        )}

        {gameStart ? (
          <div>
            {/* <form className={styles.form} onSubmit={askQuestion}>
              <div className={styles.questionContainer}>
                <Select
                  label="Field"
                  options={FIELD_OPTIONS}
                  value={selectedField}
                  onChange={(value: string) => {
                    const newField = value as QuestionField;
                    setSelectedField(newField);
                    setSelectedOperator("");
                    setSelectedValue("");
                  }}
                />

                <Select
                  label="Operator"
                  options={availableOperators}
                  value={selectedOperator}
                  onChange={(value: string) => {
                    setSelectedOperator(value);
                    setSelectedValue("");
                  }}
                />

                {hasPresetValues ? (
                  <Select
                    label="Value"
                    options={availableValues}
                    value={selectedValue}
                    onChange={(value: string) => {
                      setSelectedValue(value);
                    }}
                  />
                ) : (
                  <TextInput
                    label="Value"
                    id="value"
                    name="value"
                    value={selectedValue}
                    placeholder="Enter a value"
                    disabled={!selectedField}
                    onChange={setSelectedValue}
                  />
                )}
              </div>
              <div className={styles.prettyQuestion}>
                <p>{prettyQuestion}</p>
              </div>
              <Button
                label="Ask"
                type="submit"
                children="Ask"
                disabled={
                  !selectedField ||
                  !selectedOperator ||
                  (valueIsRequired && !selectedValue) ||
                  guessesRemaining <= 1
                }
                id="ask-button"
                name="ask-button"
              />
            </form> */}

            <form
              id="guess-form"
              className={styles.form}
              onSubmit={handleSubmitGuess}
            >
              <CustomSearchable
                id="guess-search"
                ref={guessInputRef}
                fetchOptions={fetchCardOptions}
                displayValue={(card) => card.name}
                renderOption={(card) => <div>{card.name}</div>}
                placeholder="Search for a card..."
                minQueryLength={2}
                onSelect={(card) => setSelectedGuessCard(card.oracle_id)}
              />

              <button
                type="submit"
                className={styles.button}
                disabled={guessesRemaining <= 0}
              >
                Guess
              </button>
            </form>
            <InfoGrid rows={infoGrid} />
          </div>
        ) : (
          <div>MTG 21 Questions!</div>
        )}

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
