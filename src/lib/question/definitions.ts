import type { QuestionDefinition, QuestionField } from "./types";
import { FIELD_OPERATOR_COMPATIBILITY } from "./options";

export const QUESTION_DEFINITIONS: Record<QuestionField, QuestionDefinition> = {
  colors: {
    operators: FIELD_OPERATOR_COMPATIBILITY.colors,
    requiresValue: () => true,
  },
  color_identity: {
    operators: FIELD_OPERATOR_COMPATIBILITY.color_identity,
    requiresValue: () => true,
  },
  cmc: {
    operators: FIELD_OPERATOR_COMPATIBILITY.cmc,
    requiresValue: () => true,
  },
  keywords: {
    operators: FIELD_OPERATOR_COMPATIBILITY.keywords,
    requiresValue: (operator) => operator !== "has_any",
  },
  produced_mana: {
    operators: FIELD_OPERATOR_COMPATIBILITY.produced_mana,
    requiresValue: (operator) => operator !== "has_any",
  },
  power: {
    operators: FIELD_OPERATOR_COMPATIBILITY.power,
    requiresValue: () => true,
  },
  toughness: {
    operators: FIELD_OPERATOR_COMPATIBILITY.toughness,
    requiresValue: () => true,
  },
  flavor_text: {
    operators: FIELD_OPERATOR_COMPATIBILITY.flavor_text,
    requiresValue: (operator) => operator !== "has_any",
  },
  type_line: {
    operators: FIELD_OPERATOR_COMPATIBILITY.type_line,
    requiresValue: () => true,
  },
  oracle_text: {
    operators: FIELD_OPERATOR_COMPATIBILITY.oracle_text,
    requiresValue: (operator) => operator !== "has_any",
  },
  rarity: {
    operators: FIELD_OPERATOR_COMPATIBILITY.rarity,
    requiresValue: () => true,
  },
  legalities: {
    operators: FIELD_OPERATOR_COMPATIBILITY.legalities,
    requiresValue: () => true,
  },
  game_changer: {
    operators: FIELD_OPERATOR_COMPATIBILITY.game_changer,
    requiresValue: () => true,
  },
  release_year: {
    operators: FIELD_OPERATOR_COMPATIBILITY.release_year,
    requiresValue: () => true,
  },
};
