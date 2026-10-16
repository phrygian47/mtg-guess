import crypto from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { sql } from "@/lib/db/db";

const IMAGE_MAX_WIDTH = 800;
const IMAGE_QUALITY = 80;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type ProcessedItemImage = {
  bytes: Buffer;
  hash: string;
  width: number;
  height: number;
};

export type ExistingItemImage = {
  image_hash: string;
  image_url: string;
};

export type SaveEverydayItemInput = {
  slug: string;
  name: string;
  priceCents: number;
  priceAsOf?: string | null;
  notes?: string | null;
  enabled?: boolean;
  image: ProcessedItemImage;
  existing?: ExistingItemImage;
};

export async function processItemImage(
  source: Buffer,
): Promise<ProcessedItemImage> {
  const { data, info } = await sharp(source)
    .rotate()
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    bytes: data,
    hash: crypto.createHash("sha1").update(data).digest("hex").slice(0, 10),
    width: info.width,
    height: info.height,
  };
}

export async function ensureEverydayItemsTable() {
  await sql`
    create table if not exists everyday_items (
        id bigserial primary key
      , slug text not null unique
      , name text not null
      , price_cents integer not null
      , price_as_of date not null
      , image_url text not null
      , image_hash text not null
      , image_width integer not null
      , image_height integer not null
      , notes text
      , enabled boolean not null default true
      , created_at timestamptz not null default now()
      , updated_at timestamptz not null default now()
    )
  `;
}

export async function ensureMatchupsTable() {
  await sql`
    create table if not exists price_matchups (
        id bigserial primary key
      , item_id bigint not null references everyday_items(id) on delete cascade
      , printing_uuid text not null references card_printings(uuid)
      , card_name_override text
      , card_price_override_usd numeric check (card_price_override_usd > 0)
      , enabled boolean not null default true
      , created_at timestamptz not null default now()
    )
  `;
  await sql`
    create unique index if not exists price_matchups_unique_idx
      on price_matchups (
          item_id
        , printing_uuid
        , coalesce(card_name_override, '')
        , coalesce(card_price_override_usd, -1)
      )
  `;
}

export async function getExistingItemImages(): Promise<
  Map<string, ExistingItemImage>
> {
  const rows = (await sql`
    select slug, image_hash, image_url from everyday_items
  `) as (ExistingItemImage & { slug: string })[];

  return new Map(rows.map((row) => [row.slug, row]));
}

export async function saveEverydayItem(
  input: SaveEverydayItemInput,
): Promise<{ uploaded: boolean; imageUrl: string }> {
  const { image, existing } = input;
  let imageUrl = existing?.image_url;
  let uploaded = false;

  if (!imageUrl || existing?.image_hash !== image.hash) {
    const blob = await put(
      `items/${input.slug}-${image.hash}.webp`,
      image.bytes,
      {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
        allowOverwrite: true,
      },
    );

    imageUrl = blob.url;
    uploaded = true;
  }

  await sql`
    insert into everyday_items (
        slug, name, price_cents, price_as_of
      , image_url, image_hash, image_width, image_height, notes, enabled
    )
    values (
        ${input.slug}
      , ${input.name.trim()}
      , ${input.priceCents}
      , coalesce(${input.priceAsOf ?? null}::date, current_date)
      , ${imageUrl}
      , ${image.hash}
      , ${image.width}
      , ${image.height}
      , ${input.notes ?? null}
      , ${input.enabled ?? true}
    )
    on conflict (slug) do update set
        name = excluded.name
      , price_cents = excluded.price_cents
      , price_as_of = excluded.price_as_of
      , image_url = excluded.image_url
      , image_hash = excluded.image_hash
      , image_width = excluded.image_width
      , image_height = excluded.image_height
      , notes = excluded.notes
      , enabled = excluded.enabled
      , updated_at = now()
  `;

  return { uploaded, imageUrl };
}
