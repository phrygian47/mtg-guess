import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { del } from "@vercel/blob";

// Local-only tool for building price matchups. Not part of the Next.js app:
// it listens on 127.0.0.1 only and is never deployed. Start it with `npm run admin`.

const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_PORT ?? 4321);
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const HIDDEN_SET_TYPES = [
  "promo",
  "token",
  "memorabilia",
  "minigame",
  "box",
  "masterpiece",
  "treasure_chest",
];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    size += (chunk as Buffer).length;

    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, "Request too large (15MB max).");
    }

    chunks.push(chunk as Buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Body must be valid JSON.");
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${field} is required.`);
  }

  return value.trim();
}

function requirePrice(value: unknown): number {
  const price = Number(value);

  if (!Number.isFinite(price) || price <= 0) {
    throw new HttpError(400, "Price must be a positive number.");
  }

  return Math.round(price * 100);
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing from .env.local.");
  }

  const { sql } = await import("@/lib/db/db");
  const items = await import("@/lib/items/everydayItems");

  await items.ensureEverydayItemsTable();
  await items.ensureMatchupsTable();

  const indexHtml = await fs.readFile(
    path.join(process.cwd(), "src", "scripts", "admin", "index.html"),
    "utf8",
  );

  async function listItems() {
    return sql`
      select
          i.id::int as id
        , i.slug
        , i.name
        , i.price_cents
        , i.price_as_of::text as price_as_of
        , i.image_url
        , i.enabled
        , (select count(*)::int from price_matchups m where m.item_id = i.id) as matchup_count
      from everyday_items i
      order by i.created_at desc
    `;
  }

  async function createItem(body: Record<string, unknown>) {
    const name = requireString(body.name, "Title");
    const priceCents = requirePrice(body.price_usd);
    const imageData = requireString(body.image, "Image").replace(
      /^data:[^;]+;base64,/,
      "",
    );

    let image;

    try {
      image = await items.processItemImage(Buffer.from(imageData, "base64"));
    } catch {
      throw new HttpError(400, "That file isn't a readable image.");
    }

    const baseSlug = slugify(name);
    const taken = await items.getExistingItemImages();
    let slug = baseSlug;

    for (let suffix = 2; taken.has(slug); suffix++) {
      slug = `${baseSlug}-${suffix}`;
    }

    await items.saveEverydayItem({ slug, name, priceCents, image });

    return { slug };
  }

  async function updateItem(id: number, body: Record<string, unknown>) {
    const name = body.name === undefined ? null : requireString(body.name, "Title");
    const priceCents =
      body.price_usd === undefined ? null : requirePrice(body.price_usd);
    const enabled = typeof body.enabled === "boolean" ? body.enabled : null;

    const rows = await sql`
      update everyday_items
      set
          name = coalesce(${name}, name)
        , price_cents = coalesce(${priceCents}::int, price_cents)
        , price_as_of = case
            when ${priceCents}::int is not null and ${priceCents}::int <> price_cents
              then current_date
            else price_as_of
          end
        , enabled = coalesce(${enabled}::boolean, enabled)
        , updated_at = now()
      where id = ${id}
      returning id
    `;

    if (rows.length === 0) throw new HttpError(404, "Item not found.");

    return { ok: true };
  }

  async function deleteItem(id: number) {
    const rows = (await sql`
      delete from everyday_items where id = ${id} returning image_url
    `) as { image_url: string }[];

    if (rows.length === 0) throw new HttpError(404, "Item not found.");

    await del(rows[0].image_url).catch(() => undefined);

    return { ok: true };
  }

  async function searchPrintings(
    query: string,
    hideSpecial: boolean,
    pricedOnly: boolean,
  ) {
    const q = query.trim();

    if (q.length < 2) return [];

    return sql`
      select
          uuid
        , name
        , image_small
        , set_code
        , set_name
        , set_type
        , is_promo
        , extract(year from released_at)::int as year
        , coalesce(price_usd, price_usd_foil)::float as price
        , (price_usd is null and price_usd_foil is not null) as foil_only
      from card_printings
      where (not ${pricedOnly}::boolean or coalesce(price_usd, price_usd_foil) is not null)
        and name ilike ${"%" + escapeLike(q) + "%"}
        and (
          not ${hideSpecial}::boolean
          or (not is_promo and coalesce(set_type, '') <> all(${HIDDEN_SET_TYPES}::text[]))
        )
      order by
          (name ilike ${escapeLike(q) + "%"}) desc
        , name
        , released_at desc nulls last
      limit 60
    `;
  }

  async function listMatchups() {
    return sql`
      select
          m.id::int as id
        , m.item_id::int as item_id
        , m.enabled
        , i.name as item_name
        , i.image_url as item_image
        , i.price_cents
        , coalesce(m.card_name_override, p.name) as card_name
        , (m.card_name_override is not null) as name_overridden
        , upper(p.set_code) as set_code
        , p.image_small as card_image
        , coalesce(m.card_price_override_usd, p.price_usd, p.price_usd_foil)::float as card_price
        , coalesce(p.price_usd, p.price_usd_foil)::float as market_price
        , (m.card_price_override_usd is not null) as price_overridden
      from price_matchups m
      join everyday_items i on i.id = m.item_id
      join card_printings p on p.uuid = m.printing_uuid
      order by m.created_at desc
    `;
  }

  async function createMatchup(body: Record<string, unknown>) {
    const itemId = Number(body.item_id);
    const printingUuid = requireString(body.printing_uuid, "Card");

    if (!Number.isInteger(itemId)) throw new HttpError(400, "Pick an item.");
    if (!UUID_PATTERN.test(printingUuid)) throw new HttpError(400, "Bad card id.");

    const nameOverride =
      typeof body.card_name === "string" && body.card_name.trim()
        ? body.card_name.trim().slice(0, 120)
        : null;
    const priceOverrideCents =
      body.card_price_usd === undefined || body.card_price_usd === null
        ? null
        : requirePrice(body.card_price_usd);
    const priceOverride = priceOverrideCents === null ? null : priceOverrideCents / 100;

    const card = (await sql`
      select (coalesce(price_usd, price_usd_foil) is not null) as has_price
      from card_printings where uuid = ${printingUuid}
    `) as { has_price: boolean }[];

    if (card.length === 0) throw new HttpError(400, "Unknown printing.");

    if (!card[0].has_price && priceOverride === null) {
      throw new HttpError(
        400,
        "That printing has no market price. Enter a custom price.",
      );
    }

    const rows = await sql`
      insert into price_matchups (item_id, printing_uuid, card_name_override, card_price_override_usd)
      values (${itemId}, ${printingUuid}, ${nameOverride}, ${priceOverride})
      on conflict do nothing
      returning id
    `;

    if (rows.length === 0) {
      throw new HttpError(409, "That matchup already exists.");
    }

    return { ok: true };
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (!ALLOWED_HOSTS.has(req.headers.host ?? "")) {
        throw new HttpError(403, "Forbidden host.");
      }

      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const route = `${req.method} ${url.pathname}`;
      const idMatch = url.pathname.match(/^\/api\/(items|matchups)\/(\d+)$/);

      if (req.method !== "GET" && req.method !== "DELETE") {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
          throw new HttpError(415, "Content-Type must be application/json.");
        }
      }

      if (route === "GET /") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexHtml);
      } else if (route === "GET /api/items") {
        sendJson(res, 200, await listItems());
      } else if (route === "POST /api/items") {
        sendJson(res, 201, await createItem((await readJson(req)) as never));
      } else if (idMatch?.[1] === "items" && req.method === "PATCH") {
        sendJson(
          res,
          200,
          await updateItem(Number(idMatch[2]), (await readJson(req)) as never),
        );
      } else if (idMatch?.[1] === "items" && req.method === "DELETE") {
        sendJson(res, 200, await deleteItem(Number(idMatch[2])));
      } else if (route === "GET /api/cards") {
        sendJson(
          res,
          200,
          await searchPrintings(
            url.searchParams.get("q") ?? "",
            url.searchParams.get("hide_special") !== "0",
            url.searchParams.get("priced_only") !== "0",
          ),
        );
      } else if (route === "GET /api/matchups") {
        sendJson(res, 200, await listMatchups());
      } else if (route === "POST /api/matchups") {
        sendJson(res, 201, await createMatchup((await readJson(req)) as never));
      } else if (idMatch?.[1] === "matchups" && req.method === "DELETE") {
        await sql`delete from price_matchups where id = ${Number(idMatch[2])}`;
        sendJson(res, 200, { ok: true });
      } else {
        throw new HttpError(404, "Not found.");
      }
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message });
      } else {
        console.error(err);
        sendJson(res, 500, { error: "Something went wrong. Check the terminal." });
      }
    }
  });

  server.listen(PORT, HOST, () => {
    console.log(`Admin tool running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
