import { UUID } from "crypto";
import dotenv from "dotenv";
import { writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

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
  remoteIconUri: string;
  localIconPath: string;
  id: UUID;
};

const excludedSetTypes = new Set(["promo", "token", "memorabilia", "minigame"]);
const ICON_DIR = path.join(process.cwd(), "public", "set-icons");

async function fileExists(p: string) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function downloadIcon(set: SavedSet) {
  const filename = `set-${set.code}.svg`;
  const diskPath = path.join(ICON_DIR, filename);

  if (await fileExists(diskPath)) {
    return;
  }

  const res = await fetch(set.remoteIconUri, {
    headers: { "User-Agent": "mtg-guess/1.0" },
  });

  if (!res.ok) {
    console.warn(`Icon download failed for ${set.code}: ${res.status}`);
    return;
  }

  const svg = Buffer.from(await res.arrayBuffer());
  await writeFile(diskPath, svg);

  console.log(`Downloaded icon ${set.code} -> ${set.localIconPath}`);

  await new Promise((r) => setTimeout(r, 75));
}

async function main() {
  console.log("1. fetching set list");

  const bulkRes = await fetch("https://api.scryfall.com/sets", {
    headers: { "User-Agent": "mtg-guess/1.0", Accept: "application/json" },
  });
  if (!bulkRes.ok) {
    throw new Error(`Failed to fetch set list: ${bulkRes.status}`);
  }

  const data = await bulkRes.json();

  const sets: SavedSet[] = data.data
    .filter((set: RawSet) => !set.digital)
    .filter((set: RawSet) => !excludedSetTypes.has(set.set_type))
    .map((set: RawSet) => ({
      id: set.id,
      code: set.code,
      name: set.name,
      remoteIconUri: set.icon_svg_uri,
      localIconPath: `/set-icons/set-${set.code}.svg`, // public URL path
    }));

  await mkdir(ICON_DIR, { recursive: true });

  const { sql } = await import("@/lib/db/db");

  const shouldResetSetsTable = process.env.RESET_SETS_TABLE === "true";
  console.log("shouldResetSetsTable:", shouldResetSetsTable);

  if (shouldResetSetsTable) {
    await sql`truncate table sets`;
    console.log("sets table truncated");
  }

  for (const set of sets) {
    try {
      // 1. Download the icon locally (skips if already present)
      await downloadIcon(set);

      // 2. Upsert the row, storing the LOCAL path (not the remote URI)
      await sql`
        insert into sets(id, code, name, imageuri)
        values(${set.id}, ${set.code}, ${set.name}, ${set.localIconPath})
        ON CONFLICT (id)
        DO UPDATE SET
            code     = EXCLUDED.code,
            name     = EXCLUDED.name,
            imageuri = EXCLUDED.imageuri
      `;

      console.log(`Set upserted ${set.code}: ${set.name}`);
    } catch (err) {
      console.error("insert failed for set:", set.name, set.code, err);
      throw err;
    }
  }

  console.log("Import Completed");
  return { ok: true, selected: sets.length };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
