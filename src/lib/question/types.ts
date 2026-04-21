export type QuestionField =
  | "colors"
  | "color_identity"
  | "cmc"
  | "keywords"
  | "produced_mana"
  | "power"
  | "toughness"
  | "flavor_text"
  | "type_line"
  | "oracle_text"
  | "rarity"
  | "legalities"
  | "game_changer"
  | "release_year";

export type QuestionOp =
  | "equals"
  | "not_equals"
  | "includes"
  | "excludes"
  | "greater_than"
  | "less_than"
  | "is"
  | "is_not"
  | "is_exactly"
  | "has_any";

export type Question = {
  field: QuestionField;
  op: QuestionOp;
  value?: string | number | string[] | Record<string, string>;
  label: string;
  answer: boolean;
};

export type ColorCode = "W" | "U" | "B" | "R" | "G" | "C" | "M";

export type OptionItem<T extends string = string> = {
  value: T;
  label: string;
};

export type Rarity = "common" | "uncommon" | "rare" | "mythic";

export type LegalityStatus = "legal" | "not_legal" | "restricted" | "banned";

export type FormatName =
  | "standard"
  | "future"
  | "historic"
  | "timeless"
  | "gladiator"
  | "pioneer"
  | "modern"
  | "legacy"
  | "pauper"
  | "vintage"
  | "penny"
  | "commander"
  | "oathbreaker"
  | "standardbrawl"
  | "brawl"
  | "alchemy"
  | "paupercommander"
  | "duel"
  | "oldschool"
  | "premodern"
  | "predh";

export type QuestionDefinition = {
  operators: QuestionOp[];
  requiresValue: (operator: QuestionOp) => boolean;
};
