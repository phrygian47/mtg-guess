import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";

const FILE_PATH = "src/assets/card-pool.csv";

// Matching on the front face alone would otherwise also hit art cards and
// tokens, which reuse real card names -- "Baleful Beholder" exists as a real
// card, an art_series entry and a token. Only real playable layouts qualify.
const EXCLUDED_LAYOUTS = [
  "art_series",
  "token",
  "double_faced_token",
  "emblem",
  "scheme",
  "planar",
  "vanguard",
  "augment",
  "host",
  "reversible_card",
];

async function main() {
  const { sql } = await import("@/lib/db/db");

  const raw = fs.readFileSync(FILE_PATH, "utf8");

  const names = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  console.log(`Read ${names.length} names`);

  await sql`
    insert into card_pool (oracle_id, enabled, weight)
    select distinct c.oracle_id, true, 1
    from cards c
    join unnest(${names}::text[]) as imported(name)
      on lower(split_part(c.name, ' // ', 1)) = lower(imported.name)
    where c.oracle_id is not null
      and coalesce(c.layout, '') <> all(${EXCLUDED_LAYOUTS}::text[])
      and c.name not like 'A-%'
    on conflict (oracle_id) do update
    set enabled = true
  `;

  const unmatched = await sql`
    select imported.name
    from unnest(${names}::text[]) as imported(name)
    left join cards c
      on lower(split_part(c.name, ' // ', 1)) = lower(imported.name)
     and coalesce(c.layout, '') <> all(${EXCLUDED_LAYOUTS}::text[])
     and c.name not like 'A-%'
    where c.oracle_id is null
    order by imported.name
  `;

  console.log("Unmatched:");
  console.log(unmatched);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
