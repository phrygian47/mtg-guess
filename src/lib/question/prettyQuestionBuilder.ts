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
    is: ({ operatorLabel, valueLabel }) =>
      `Is the card's mana value ${operatorLabel.toLowerCase()} ${valueLabel}?`,
    greater_than: ({ operatorLabel, valueLabel }) =>
      `Is the card's mana value ${operatorLabel.toLowerCase()} ${valueLabel}?`,
    less_than: ({ operatorLabel, valueLabel }) =>
      `Is the card's mana value ${operatorLabel.toLowerCase()} ${valueLabel}?`,
  },
  type_line: {
    includes: ({ valueLabel }) => `Is the card a ${valueLabel}?`,
  },
  keywords: {
    includes: ({ valueLabel }) => `Does the card have ${valueLabel}?`,
  },
  rarity: {
    is: ({ valueLabel }) => `Is the card ${valueLabel} rarity?`,
  },
  release_year: {
    is: ({ operatorLabel, valueLabel }) =>
      `Was the card released ${operatorLabel.toLowerCase()} ${valueLabel}?`,
    greater_than: ({ operatorLabel, valueLabel }) =>
      `Was the card released ${operatorLabel.toLowerCase()} ${valueLabel}?`,
    less_than: ({ operatorLabel, valueLabel }) =>
      `Was the card released ${operatorLabel.toLowerCase()} ${valueLabel}?`,
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
