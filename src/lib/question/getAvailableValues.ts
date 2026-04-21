import { VALUE_OPTIONS } from "./options";
import type { QuestionField, QuestionOp, OptionItem } from "./types";

export function getAvailableValues(
  field: QuestionField | "",
  operator: string,
): OptionItem[] {
  if (!field) return [];

  let options = VALUE_OPTIONS[field] ?? [];

  if (field === "power" || field === "toughness") {
    options = options.filter(
      (option) => option.value !== "*" || operator === "equals",
    );
  }

  if (field === "colors" && operator === "is_exactly") {
    options = options.filter((option) => option.value !== "M");
  }

  if (field === "color_identity") {
    options = options.filter((option) => option.value !== "M");
  }

  return options;
}
