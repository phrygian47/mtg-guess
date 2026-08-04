import dotenv from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });

// chainTokens.ts is db-free, so a static import is safe here. Anything that
// pulls in db.ts must be imported dynamically after dotenv.config() has run,
// because db.ts throws at module load when DATABASE_URL is missing.
import {
  CHAIN_ROW_COUNT,
  getChainLinkName,
  normalizeChainToken,
} from "@/lib/game/chainTokens";

type Sql = typeof import("@/lib/db/db")["sql"];

let sql: Sql;

const PUZZLE_DIR = path.join(process.cwd(), "data", "chain-puzzles");
const TOKEN_PATTERN = /^[A-Za-z]+$/;
const SHORT_TOKEN_LENGTH = 4;

type ChainPuzzleFile = {
  slug?: unknown;
  notes?: unknown;
  status?: unknown;
  tokens?: unknown;
};

type CardRow = {
  oracle_id: string;
  name: string;
};

type ResolvedChain = {
  slug: string;
  notes: string | null;
  status: string;
  tokens: string[];
  linkOracleIds: (string | null)[];
};

async function main() {
  ({ sql } = await import("@/lib/db/db"));

  const fileNames = (await readdir(PUZZLE_DIR)).filter((name) =>
    name.endsWith(".json"),
  );

  if (fileNames.length === 0) {
    console.log(`No puzzle files found in ${PUZZLE_DIR}.`);
    return;
  }

  const resolved: ResolvedChain[] = [];
  const failures: string[] = [];

  for (const fileName of fileNames) {
    try {
      resolved.push(await resolveChainFile(fileName));
    } catch (error) {
      failures.push(`${fileName}: ${(error as Error).message}`);
    }
  }

  // Nothing is written unless every file is valid, so a broken chain can never
  // land in the pool alongside good ones.
  if (failures.length > 0) {
    console.error(`Refusing to import. ${failures.length} file(s) failed:`);

    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }

    process.exitCode = 1;
    return;
  }

  for (const chain of resolved) {
    await upsertChain(chain);
    console.log(`Imported ${chain.slug} (${chain.status})`);
  }

  console.log(`\nDone. ${resolved.length} chain(s) imported.`);
}

async function resolveChainFile(fileName: string): Promise<ResolvedChain> {
  const raw = await readFile(path.join(PUZZLE_DIR, fileName), "utf8");
  const parsed = JSON.parse(raw) as ChainPuzzleFile;

  const slug = typeof parsed.slug === "string" ? parsed.slug.trim() : "";

  if (!slug) {
    throw new Error("missing slug");
  }

  if (!Array.isArray(parsed.tokens) || parsed.tokens.length !== CHAIN_ROW_COUNT) {
    throw new Error(`tokens must be an array of exactly ${CHAIN_ROW_COUNT}`);
  }

  const tokens = parsed.tokens.map((token) =>
    typeof token === "string" ? token.trim() : "",
  );

  for (const [index, token] of tokens.entries()) {
    // v1 renders each row as letter tiles, so multi-word or punctuated tokens
    // would need reveal rules that do not exist yet.
    if (!TOKEN_PATTERN.test(token)) {
      throw new Error(`token ${index} ("${token}") must be a single A-Z word`);
    }
  }

  const status =
    typeof parsed.status === "string" && parsed.status.trim()
      ? parsed.status.trim()
      : "draft";

  if (!["draft", "ready", "retired"].includes(status)) {
    throw new Error(`unknown status "${status}"`);
  }

  const linkOracleIds: (string | null)[] = [];

  for (let index = 0; index < tokens.length - 1; index++) {
    const linkName = getChainLinkName(tokens[index], tokens[index + 1]);
    const oracleId = await findCardByName(linkName);

    if (!oracleId) {
      throw new Error(`"${linkName}" is not a real card`);
    }

    linkOracleIds.push(oracleId);
  }

  // The final row starts no link.
  linkOracleIds.push(null);

  const shortTokens = tokens.filter(
    (token) => token.length < SHORT_TOKEN_LENGTH,
  );

  if (shortTokens.length > 0) {
    // Not fatal, but worth seeing: a short word gives the player very few
    // misses before it is fully revealed.
    console.warn(
      `  warning: ${fileName} has short token(s): ${shortTokens.join(", ")}`,
    );
  }

  return {
    slug,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    status,
    tokens,
    linkOracleIds,
  };
}

async function findCardByName(name: string): Promise<string | null> {
  const normalized = normalizeChainToken(name);

  const rows = (await sql`
    select
        oracle_id::text as oracle_id
      , name
    from cards
    where lower(name) = lower(${name})
    limit 1
  `) as CardRow[];

  if (rows[0]) {
    return rows[0].oracle_id;
  }

  // Fall back to the same normalization the game uses at guess time, so a
  // punctuation mismatch in the source file does not block a valid chain.
  const fuzzyRows = (await sql`
    select
        oracle_id::text as oracle_id
      , name
    from cards
    where regexp_replace(lower(name), '[^a-z0-9]', '', 'g') = ${normalized}
    limit 1
  `) as CardRow[];

  return fuzzyRows[0]?.oracle_id ?? null;
}

async function upsertChain(chain: ResolvedChain) {
  const rows = (await sql`
    insert into chain_puzzles (slug, status, notes, updated_at)
    values (${chain.slug}, ${chain.status}, ${chain.notes}, now())
    on conflict (slug) do update
      set status = excluded.status
        , notes = excluded.notes
        , updated_at = now()
    returning id
  `) as { id: number | string }[];

  const chainPuzzleId = Number(rows[0]?.id);

  if (!chainPuzzleId) {
    throw new Error(`could not upsert ${chain.slug}`);
  }

  // Re-importing replaces the steps wholesale, which keeps edits simple.
  await sql`
    delete from chain_puzzle_steps
    where chain_puzzle_id = ${chainPuzzleId}
  `;

  const stepsToInsert = chain.tokens.map((token, index) => ({
    position: index,
    token,
    link_oracle_id: chain.linkOracleIds[index],
  }));

  await sql`
    insert into chain_puzzle_steps (
        chain_puzzle_id
      , position
      , token
      , link_oracle_id
    )
    select
        ${chainPuzzleId}::bigint
      , incoming.position
      , incoming.token
      , incoming.link_oracle_id
    from jsonb_to_recordset(${JSON.stringify(stepsToInsert)}::jsonb) as incoming(
        position integer
      , token text
      , link_oracle_id uuid
    )
    order by incoming.position
  `;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
