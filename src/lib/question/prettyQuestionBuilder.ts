import type { QuestionField } from "@/lib/question/types";

type PrettyQuestionParams = {
  field: QuestionField | "";
  operator: string;
  value: string;
  fieldLabel: string;
  operatorLabel: string;
  valueLabel: string;
};

type Formatter = (params: PrettyQuestionParams) => string;

const prettyQuestionFormatters: Partial<
  Record<QuestionField, Partial<Record<string, Formatter>>>
> = {
  colors: {
    is: ({ valueLabel }) => `Is the card ${valueLabel}?`,
    is_not: ({ valueLabel }) => `Is the card not ${valueLabel}?`,
  },
  color_identity: {
    is: ({ valueLabel }) => `Is the card's color identity ${valueLabel}?`,
    is_not: ({ valueLabel }) =>
      `Is the card's color identity not ${valueLabel}?`,
  },
  cmc: {
    equals: ({ valueLabel }) =>
      `Is the card's mana value equal to ${valueLabel}?`,
    not_equals: ({ valueLabel }) =>
      `Is the card's mana value not equal to ${valueLabel}?`,
    greater_than: ({ valueLabel }) =>
      `Is the card's mana value greater than ${valueLabel}?`,
    less_than: ({ valueLabel }) =>
      `Is the card's mana value less than ${valueLabel}?`,
  },
  type_line: {
    includes: ({ valueLabel }) => `Is the card a ${valueLabel}?`,
  },
  keywords: {
    includes: ({ valueLabel }) => `Does the card have ${valueLabel}?`,
    excludes: ({ valueLabel }) => `Does the card not have ${valueLabel}?`,
  },
  power: {
    equals: ({ valueLabel, value }) =>
      `Is the card's power ${value === "*" ? "variable" : "equal to " + valueLabel}?`,
    not_equals: ({ valueLabel }) =>
      `Is the card's power not equal to ${valueLabel}?`,
    greater_than: ({ valueLabel }) =>
      `Is the card's power greater than ${valueLabel}?`,
    less_than: ({ valueLabel }) =>
      `Is the card's power less than ${valueLabel}?`,
  },
  toughness: {
    equals: ({ valueLabel, value }) =>
      `Is the card's toughness ${value === "*" ? "variable" : "equal to " + valueLabel}?`,
    not_equals: ({ valueLabel }) =>
      `Is the card's toughness not equal to ${valueLabel}?`,
    greater_than: ({ valueLabel }) =>
      `Is the card's toughness greater than ${valueLabel}?`,
    less_than: ({ valueLabel }) =>
      `Is the card's toughness less than ${valueLabel}?`,
  },
  rarity: {
    equals: ({ valueLabel }) =>
      `Is the card ${valueLabel === "uncommon" ? "an" : "a"} ${valueLabel}?`,
    not_equals: ({ valueLabel }) =>
      `Is the card not ${valueLabel === "uncommon" ? "an" : "a"} ${valueLabel}?`,
  },
  release_year: {
    equals: ({ valueLabel }) => `Was the card released in ${valueLabel}?`,
    not_equals: ({ valueLabel }) =>
      `Was the card not released in ${valueLabel}?`,
    greater_than: ({ valueLabel }) =>
      `Was the card released after ${valueLabel}?`,
    less_than: ({ valueLabel }) =>
      `Was the card released before ${valueLabel}?`,
  },
  game_changer: {
    is: ({ valueLabel }) =>
      `${valueLabel === "True" ? "Is the card a game changer?" : "Is the card not a game changer?"}`,
  },
  produced_mana: {
    includes: ({ valueLabel }) => `Does the card produce ${valueLabel} mana?`,
  },
  legalities: {
    includes: ({ valueLabel }) => `Is the card legal in ${valueLabel}?`,
    excludes: ({ valueLabel }) => `Is the card banned in ${valueLabel}?`,
  },
};

export function formatPrettyQuestion({
  field,
  operator,
  value,
  fieldLabel,
  operatorLabel,
  valueLabel,
}: PrettyQuestionParams): string {
  if (!field) return "Choose a field to ask a question.";
  if (!operator || !value) return "Finish building your question.";

  const customFormatter = prettyQuestionFormatters[field]?.[operator];
  if (customFormatter) {
    return customFormatter({
      field,
      operator,
      value,
      fieldLabel,
      operatorLabel,
      valueLabel,
    });
  }

  return `Is the card's ${fieldLabel.toLowerCase()} ${operatorLabel.toLowerCase()} ${valueLabel}?`;
}
