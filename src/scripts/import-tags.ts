import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

type DbTag = {
  slug: string;
  label: string;
};

type ScryfallCard = {
  oracle_id?: string | null;
};

type ScryfallSearchResponse = {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRateLimit(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "mtgdle/1.0",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 429) {
    const text = await res.text();
    console.warn(`Rate limited. Waiting 60 seconds...`);
    console.warn(text);

    await sleep(60_000);
    return fetchWithRateLimit(url);
  }

  return res;
}

async function fetchOracleIdsForTag(tagSlug: string): Promise<string[]> {
  let url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    `otag:${tagSlug}`,
  )}&unique=cards`;

  const oracleIds = new Set<string>();

  while (url) {
    const res = await fetchWithRateLimit(url);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed for tag "${tagSlug}": ${res.status} ${text}`);
    }

    const json = (await res.json()) as ScryfallSearchResponse;

    for (const card of json.data) {
      if (card.oracle_id) {
        oracleIds.add(card.oracle_id);
      }
    }

    url = json.has_more && json.next_page ? json.next_page : "";

    if (url) {
      await sleep(600);
    }
  }

  return [...oracleIds];
}

async function syncAllTags() {
  const { sql } = await import("@/lib/db/db");

  const rows = await sql`
    select slug, label
    from tags
    where enabled = true
    order by slug
  `;

  const tags = rows as DbTag[];

  for (const tag of tags) {
    console.log(`Syncing ${tag.slug}...`);

    const oracleIds = await fetchOracleIdsForTag(tag.slug);

    await sql`
      delete from card_tags
      where tag_slug = ${tag.slug}
        and source = 'scryfall_tagger'
    `;

    if (oracleIds.length === 0) {
      await sleep(600);
      continue;
    }

    await sql`
      insert into card_tags (oracle_id, tag_slug, source)
      select c.oracle_id, ${tag.slug}, 'scryfall_tagger'
      from cards c
      where c.oracle_id = any(${oracleIds}::uuid[])
      on conflict (oracle_id, tag_slug) do update
      set source = excluded.source
    `;

    await sleep(600);
  }
}

syncAllTags().catch((err) => {
  console.error(err);
  process.exit(1);
});
