export type StartInfo = {
  colors: string[];
  type: string;
};

export type CellTone = "correct" | "partial" | "wrong" | "neutral";

export type InfoCell = {
  value: string | number | null;
  tone?: CellTone;
};

export type InfoOtherCell = {
  value: InfoOtherLine[];
  tone?: CellTone;
};

export type InfoGridRow = {
  card: InfoCell;
  colors: InfoCell;
  mana_value: InfoCell;
  type: InfoCell;
  subtypes: InfoCell;
  set: InfoCell;
  rarity: InfoCell;
  other: InfoOtherCell;
};

export type InfoOtherLine = {
  label: string;
  value: string;
  tone: CellTone;
};
