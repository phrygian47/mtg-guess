export type CellTone = "correct" | "partial" | "wrong" | "neutral";

export type ReleaseYearDirection = "higher" | "lower" | "same" | null;

export type NumberDirection = "higher" | "lower" | "same" | null;

export type SupplementalInfoBadge = {
  label: string;
  value: string;
  kind?: "text" | "mana";
  tone?: CellTone;
};

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
  mana_value: InfoCell<string | number> & {
    direction?: NumberDirection;
  };
  type_line: InfoCell<string>;
  set: InfoCell<string | SetInfo>;
  rarity: InfoCell<string>;
  tags: InfoCell<string>;
  supplemental_info: InfoCell<SupplementalInfoBadge[]>;
};
