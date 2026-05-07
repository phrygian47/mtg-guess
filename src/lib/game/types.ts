export type StartInfo = {
  colors: string[];
  type: string;
};

export type CellTone = "correct" | "partial" | "wrong" | "neutral";

export type InfoCell = {
  value: React.ReactNode;
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
  stats: InfoCell;
  keywords: InfoCell;
};
