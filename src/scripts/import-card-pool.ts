import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs";

const FILE_PATH = "src/assets/card-pool.csv";

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
      on lower(c.name) = lower(imported.name)
    where c.oracle_id is not null
    on conflict (oracle_id) do update
    set enabled = true
  `;

  const unmatched = await sql`
    select imported.name
    from unnest(${names}::text[]) as imported(name)
    left join cards c
      on lower(c.name) = lower(imported.name)
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
