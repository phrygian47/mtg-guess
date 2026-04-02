import type {
  QuestionField,
  QuestionOp,
  ColorCode,
  OptionItem,
  Rarity,
  LegalityStatus,
  FormatName,
} from "./types";

export const FIELD_OPTIONS: { value: QuestionField; label: string }[] = [
  { value: "colors", label: "Color" },
  { value: "color_identity", label: "Color Identity" },
  { value: "cmc", label: "Mana Value" },
  { value: "type_line", label: "Card Type" },
  { value: "keywords", label: "Keyword" },
  { value: "power", label: "Power" },
  { value: "toughness", label: "Toughness" },
  { value: "rarity", label: "Rarity" },
  { value: "release_year", label: "Release Year" },
  { value: "legalities", label: "Format Legality" },
  { value: "game_changer", label: "Game Changer" },
  { value: "produced_mana", label: "Produced Mana" },
  { value: "flavor_text", label: "Flavor Text" },
  { value: "oracle_text", label: "Card Text" },
];

export const RARITY_OPTIONS: OptionItem<Rarity>[] = [
  { value: "common", label: "Common" },
  { value: "uncommon", label: "Uncommon" },
  { value: "rare", label: "Rare" },
  { value: "mythic", label: "Mythic" },
];

export const FORMAT_OPTIONS: OptionItem<FormatName>[] = [
  { value: "standard", label: "Standard" },
  { value: "future", label: "Future" },
  { value: "historic", label: "Historic" },
  { value: "timeless", label: "Timeless" },
  { value: "gladiator", label: "Gladiator" },
  { value: "pioneer", label: "Pioneer" },
  { value: "modern", label: "Modern" },
  { value: "legacy", label: "Legacy" },
  { value: "pauper", label: "Pauper" },
  { value: "vintage", label: "Vintage" },
  { value: "penny", label: "Penny" },
  { value: "commander", label: "Commander" },
  { value: "oathbreaker", label: "Oathbreaker" },
  { value: "standardbrawl", label: "Standard Brawl" },
  { value: "brawl", label: "Brawl" },
  { value: "alchemy", label: "Alchemy" },
  { value: "paupercommander", label: "Pauper Commander" },
  { value: "duel", label: "Duel Commander" },
  { value: "oldschool", label: "Old School" },
  { value: "premodern", label: "Premodern" },
  { value: "predh", label: "PreDH" },
];

export const LEGALITY_OPTIONS: OptionItem<LegalityStatus>[] = [
  { value: "legal", label: "Legal" },
  { value: "not_legal", label: "Not Legal" },
  { value: "restricted", label: "Restricted" },
  { value: "banned", label: "Banned" },
];

export const RELEASE_YEAR_OPTIONS: OptionItem[] = Array.from(
  { length: new Date().getFullYear() - 1993 + 1 },
  (_, i) => {
    const year = (new Date().getFullYear() - i).toString();
    return {
      value: year,
      label: year,
    };
  },
);

export const GAME_CHANGER_OPTIONS: OptionItem[] = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
];

export const COMMON_KEYWORD_VALUES = [
  "Deathtouch",
  "Defender",
  "Double Strike",
  "Enchant",
  "Equip",
  "First Strike",
  "Flash",
  "Flying",
  "Haste",
  "Hexproof",
  "Indestructible",
  "Lifelink",
  "Menace",
  "Prowess",
  "Reach",
  "Trample",
  "Vigilance",
] as const;

export const UNCOMMON_KEYWORD_VALUES = [
  "Absorb",
  "Affinity",
  "Amplify",
  "Annihilator",
  "Aura Swap",
  "Awaken",
  "Banding",
  "Battle Cry",
  "Bestow",
  "Bloodthirst",
  "Bushido",
  "Buyback",
  "Cascade",
  "Champion",
  "Changeling",
  "Cipher",
  "Conspire",
  "Convoke",
  "Cumulative Upkeep",
  "Cycling",
  "Dash",
  "Delve",
  "Dethrone",
  "Devoid",
  "Devour",
  "Dredge",
  "Echo",
  "Entwine",
  "Epic",
  "Evoke",
  "Evolve",
  "Exalted",
  "Exploit",
  "Extort",
  "Fading",
  "Fear",
  "Flanking",
  "Flashback",
  "Forecast",
  "Fortify",
  "Frenzy",
  "Fuse",
  "Graft",
  "Gravestorm",
  "Haunt",
  "Hidden Agenda",
  "Hideaway",
  "Horsemanship",
  "Infect",
  "Ingest",
  "Intimidate",
  "Kicker",
  "Landhome",
  "Landwalk",
  "Level Up",
  "Living Weapon",
  "Madness",
  "Megamorph",
  "Miracle",
  "Modular",
  "Morph",
  "Myriad",
  "Ninjutsu",
  "Offering",
  "Outlast",
  "Overload",
  "Persist",
  "Phasing",
  "Poisonous",
  "Protection",
  "Provoke",
  "Prowl",
  "Rampage",
  "Rebound",
  "Recover",
  "Reinforce",
  "Renown",
  "Replicate",
  "Retrace",
  "Ripple",
  "Scavenge",
  "Skulk",
  "Shadow",
  "Shroud",
  "Soulbond",
  "Soulshift",
  "Splice",
  "Split Second",
  "Storm",
  "Substance",
  "Sunburst",
  "Surge",
  "Suspend",
  "Totem Armor",
  "Transfigure",
  "Transmute",
  "Tribute",
  "Undying",
  "Unearth",
  "Unleash",
  "Vanishing",
  "Wither",
] as const;

export const KEYWORD_VALUES = [
  ...COMMON_KEYWORD_VALUES,
  ...UNCOMMON_KEYWORD_VALUES,
] as const;

export type KeywordAbility = (typeof KEYWORD_VALUES)[number];

export const KEYWORD_OPTIONS: OptionItem<KeywordAbility>[] = KEYWORD_VALUES.map(
  (keyword) => ({
    value: keyword,
    label: keyword,
  }),
);

export const COLOR_OPTIONS: OptionItem<ColorCode>[] = [
  { value: "W", label: "White" },
  { value: "U", label: "Blue" },
  { value: "B", label: "Black" },
  { value: "R", label: "Red" },
  { value: "G", label: "Green" },
  { value: "C", label: "Colorless" },
  { value: "M", label: "Multicolor" },
];

export const VALUE_OPTIONS: Partial<Record<QuestionField, OptionItem[]>> = {
  colors: COLOR_OPTIONS,
  color_identity: COLOR_OPTIONS,
  rarity: RARITY_OPTIONS,
  keywords: KEYWORD_OPTIONS,
  release_year: RELEASE_YEAR_OPTIONS,
  game_changer: GAME_CHANGER_OPTIONS,
  produced_mana: COLOR_OPTIONS,
  legalities: FORMAT_OPTIONS,
};

export const OPERATOR_OPTIONS: { value: QuestionOp; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does Not Equal" },
  { value: "includes", label: "Includes" },
  { value: "excludes", label: "Excludes" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "is", label: "Is" },
  { value: "is_not", label: "Is Not" },
];

export const FIELD_OPERATOR_COMPATIBILITY: Record<QuestionField, QuestionOp[]> =
  {
    colors: ["is", "is_not"],
    color_identity: ["is", "is_not"],
    cmc: ["equals", "not_equals", "greater_than", "less_than"],
    type_line: ["includes", "excludes"],
    keywords: ["includes", "excludes"],
    power: ["equals", "not_equals", "greater_than", "less_than"],
    toughness: ["equals", "not_equals", "greater_than", "less_than"],
    rarity: ["equals", "not_equals"],
    release_year: ["equals", "not_equals", "greater_than", "less_than"],
    legalities: ["includes", "excludes"],
    game_changer: ["is", "is_not"],
    produced_mana: ["includes", "excludes"],
    flavor_text: ["includes", "excludes"],
    oracle_text: ["includes", "excludes"],
  };

export const NUMERIC_FIELDS: QuestionField[] = [
  "cmc",
  "power",
  "toughness",
  "release_year",
];
