import { UUID } from "crypto";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

type RawSet = {
  code: string;
  name: string;
  icon_svg_uri: string;
  digital: boolean;
  set_type: string;
  id: UUID;
};

type SavedSet = {
  code: string;
  name: string;
  imageuri: string;
  id: UUID;
};

const excludedSetTypes = new Set(["promo", "token", "memorabilia", "minigame"]);

async function main() {
  console.log("1. fetching bulk list");

  const bulkRes = await fetch("https://api.scryfall.com/sets", {
    cache: "no-store",
  });

  if (!bulkRes.ok) {
    throw new Error(`Failed to fetch Bulk Data list: ${bulkRes.status}`);
  }

  const data = await bulkRes.json();

  const sets: SavedSet[] = data.data
    .filter((set: RawSet) => !set.digital)
    .filter((set: RawSet) => !excludedSetTypes.has(set.set_type))
    .map((set: RawSet) => ({
      id: set.id,
      code: set.code,
      name: set.name,
      imageuri: set.icon_svg_uri,
    }));

  const { sql } = await import("@/lib/db/db");

  const shouldResetSetsTable = "true";

  console.log("shouldResetSetsTable:", shouldResetSetsTable);

  if (shouldResetSetsTable) {
    await sql`
    truncate table sets
  `;

    console.log("sets table truncated");
  }

  for (const set of sets) {
    try {
      await sql`
        insert into sets(
            id
        ,   code
        ,   name
        ,   imageuri
        )
        values(
            ${set.id}
        ,   ${set.code}
        ,   ${set.name}
        ,   ${set.imageuri}
        )
        ON CONFLICT (id)
        DO UPDATE SET
            code = EXCLUDED.code,
            name = EXCLUDED.name,
            imageuri = EXCLUDED.imageuri
        `;

      console.log(`Set inserted ${set.code}: ${set.name}`);
    } catch (err) {
      console.error("insert failed for card:", set.name, set.code, err);
      throw err;
    }
  }

  console.log("Import Completed");

  return {
    ok: true,
    selected: sets.length,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
