import type { QuestionField, QuestionOp } from "./types";
import { QUESTION_DEFINITIONS } from "./definitions";

export function requiresValue(
  field: QuestionField | "",
  operator: string,
): boolean {
  if (!field || !operator) return false;

  return QUESTION_DEFINITIONS[field].requiresValue(operator as QuestionOp);
}
