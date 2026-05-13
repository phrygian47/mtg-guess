export type StartInfo = {
  colors: string[];
  type: string;
};

export type CellTone = "correct" | "partial" | "wrong" | "neutral";

export type InfoCell = {
  value: string | number | null;
  tone?: CellTone;
};

export type InfoGridRow = {
  card: InfoCell;
  colors: InfoCell;
  mana_value: InfoCell;
  type_line: InfoCell;
  set: InfoCell;
  rarity: InfoCell;
  tags: InfoCell;
  release_year: InfoCell;
};
