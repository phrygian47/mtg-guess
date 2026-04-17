type LegalityStatus = "legal" | "not_legal" | "restricted" | "banned";

type Legalities = {
  standard: LegalityStatus;
  future: LegalityStatus;
  historic: LegalityStatus;
  timeless: LegalityStatus;
  gladiator: LegalityStatus;
  pioneer: LegalityStatus;
  modern: LegalityStatus;
  legacy: LegalityStatus;
  pauper: LegalityStatus;
  vintage: LegalityStatus;
  penny: LegalityStatus;
  commander: LegalityStatus;
  oathbreaker: LegalityStatus;
  standardbrawl: LegalityStatus;
  brawl: LegalityStatus;
  alchemy: LegalityStatus;
  paupercommander: LegalityStatus;
  duel: LegalityStatus;
  oldschool: LegalityStatus;
  premodern: LegalityStatus;
  predh: LegalityStatus;
};

export type Card = {
  id: string;
  oracle_id?: string;
  name: string;
  type_line?: string;
  oracle_text?: string;
  mana_cost?: string;
  colors?: string[];
  color_identity: string[];
  keywords?: string[];
  produced_mana: string[];
  power?: string;
  toughness?: string;
  cmc?: number;
  set?: string;
  set_name?: string;
  rarity?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    art_crop?: string;
  };
  artist?: string;
  released_at?: string;
  layout?: string;
  games?: string[];
  lang?: string;
  digital?: boolean;
  flavor_text?: string;
  legalities: Legalities;
  game_changer: boolean;
};
