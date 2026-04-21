import type { Card } from "../scryfall/types";
import type { Question } from "./types";

export function evaluateQuestion(card: Card, question: Question): boolean {
  switch (question.field) {
    case "keywords": {
      const keywords = card.keywords ?? [];
      const value = String(question.value);
      if (question.op === "has_any") {
        return keywords.length > 0;
      } else if (question.op === "includes") {
        return keywords.includes(value);
      } else if (question.op === "excludes") {
        return !keywords.includes(value);
      }
      return false;
    }
    case "cmc": {
      const questionValue = Number(question.value);
      const cardValue = Number(card.cmc ?? 0);

      if (Number.isNaN(questionValue)) return false;

      switch (question.op) {
        case "equals":
          return cardValue === questionValue;
        case "greater_than":
          return cardValue > questionValue;
        case "less_than":
          return cardValue < questionValue;
        default:
          return false;
      }
    }
    case "colors": {
      const value = String(question.value);
      const colors = card.colors ?? [];

      switch (question.op) {
        case "is":
          if (value === "C") return colors.length === 0;
          if (value === "M") return colors.length > 1;
          return colors.includes(value);

        case "is_not":
          if (value === "C") return colors.length !== 0;
          if (value === "M") return colors.length <= 1;
          return !colors.includes(value);

        case "is_exactly":
          if (value === "C") return colors.length === 0;
          return colors.length === 1 && colors[0] === value;

        default:
          return false;
      }
    }
    case "color_identity": {
      const value = String(question.value);
      const colors = card.color_identity ?? [];

      switch (question.op) {
        case "is":
          if (value === "C") return colors.length === 0;
          return colors.includes(value);

        case "is_not":
          if (value === "C") return colors.length !== 0;
          return !colors.includes(value);

        case "is_exactly":
          if (value === "C") return colors.length === 0;
          return colors.length === 1 && colors[0] === value;

        default:
          return false;
      }
    }
    case "type_line": {
      const value = String(question.value).toLowerCase();
      const typeLine = card.type_line?.toLowerCase() ?? "";

      switch (question.op) {
        case "includes":
          return typeLine.includes(value);
        case "excludes":
          return !typeLine.includes(value);
        default:
          return false;
      }
    }
    case "produced_mana": {
      const value = String(question.value).toUpperCase();
      const producedMana = (card.produced_mana ?? []).map((m) =>
        m.toUpperCase(),
      );

      switch (question.op) {
        case "has_any":
          return producedMana.length > 0;
        case "includes":
          return producedMana.includes(value);
        default:
          return false;
      }
    }
    case "release_year": {
      if (!card.released_at) return false;

      const questionValue = Number(question.value);
      const releasedYear = Number(card.released_at.slice(0, 4));

      if (Number.isNaN(questionValue)) {
        return false;
      }

      switch (question.op) {
        case "equals":
          return releasedYear === questionValue;
        case "not_equals":
          return releasedYear !== questionValue;
        case "greater_than":
          return releasedYear > questionValue;
        case "less_than":
          return releasedYear < questionValue;
        default:
          return false;
      }
    }
    case "power": {
      const rawPower = card.power;
      if (!rawPower) return false;

      const questionValue = Number(question.value);
      const cardValue = Number(rawPower);

      switch (question.op) {
        case "equals":
          if (question.value === "*") {
            return rawPower.includes("*");
          }
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue === questionValue;

        case "greater_than":
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue > questionValue;

        case "less_than":
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue < questionValue;

        default:
          return false;
      }
    }
    case "toughness": {
      const rawToughness = card.power;
      if (!rawToughness) return false;

      const questionValue = Number(question.value);
      const cardValue = Number(rawToughness);

      switch (question.op) {
        case "equals":
          if (question.value === "*") {
            return rawToughness.includes("*");
          }
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue === questionValue;

        case "greater_than":
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue > questionValue;

        case "less_than":
          if (Number.isNaN(questionValue) || Number.isNaN(cardValue)) {
            return false;
          }
          return cardValue < questionValue;

        default:
          return false;
      }
    }
    case "game_changer": {
      const questionValue = String(question.value).toLowerCase();
      const cardValue = card.game_changer ? "true" : "false";
      return cardValue === questionValue;
    }
    case "oracle_text": {
      const cardValue = card.oracle_text?.toLocaleLowerCase().trim() ?? "";
      const questionValue = String(question.value ?? "")
        .toLowerCase()
        .trim();

      switch (question.op) {
        case "has_any": {
          return cardValue.length > 0;
        }
        case "includes": {
          if (!questionValue) return false;
          return cardValue.includes(questionValue);
        }
        default:
          return false;
      }
    }
    case "flavor_text": {
      const cardValue = card.flavor_text?.toLowerCase().trim() ?? "";
      const questionValue = String(question.value ?? "")
        .toLowerCase()
        .trim();
      switch (question.op) {
        case "has_any":
          return cardValue.length > 0;
        case "includes": {
          if (!questionValue) return false;
          return cardValue.includes(questionValue);
        }
        default:
          return false;
      }
    }
    case "legalities": {
      const questionValue = String(question.value ?? "") as keyof NonNullable<
        Card["legalities"]
      >;
      const cardValue = card.legalities?.[questionValue];

      switch (question.op) {
        case "includes":
          return cardValue === "legal";

        case "excludes":
          return cardValue === "banned";

        default:
          return false;
      }
    }
    case "rarity": {
      const cardValue = card.rarity?.toLowerCase() ?? "";
      const questionValue = String(question.value ?? "");

      switch (question.op) {
        case "equals":
          return cardValue === questionValue;
        case "not_equals":
          return cardValue !== questionValue;
        default:
          return false;
      }
    }
    default:
      return false;
  }
}
