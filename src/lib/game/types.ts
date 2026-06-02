export type StartInfo = {
  colors: string[];
  type: string;
};

export type CellTone = "correct" | "partial" | "wrong" | "neutral";

export type ReleaseYearDirection = "higher" | "lower" | "same" | null;

export type SetInfo = {
  code: string;
  name: string | null;
  image_uri: string | null;
  release_year?: number | null;
  release_year_direction?: ReleaseYearDirection;
};

export type InfoCell<T = string | number | null> = {
  value: T;
  tone?: CellTone;
};

export type InfoGridRow = {
  card: InfoCell<string | null>;
  colors: InfoCell<string>;
  mana_value: InfoCell<string | number>;
  type_line: InfoCell<string>;
  set: InfoCell<string | SetInfo>;
  rarity: InfoCell<string>;
  tags: InfoCell<string>;
};
