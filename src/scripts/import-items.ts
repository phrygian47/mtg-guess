import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import type { ProcessedItemImage } from "@/lib/items/everydayItems";

// Bulk alternative to the admin tool (npm run admin). Source of truth:
// content/items/items.json plus the image files it names in content/items/images/.
// Each entry looks like:
//   { "slug": "gallon-of-milk", "name": "A gallon of milk", "price_usd": 4.29,
//     "image": "gallon-of-milk.jpg",
//     "notes": "national average, Sep 2026", "price_as_of": "2026-09-01",
//     "enabled": true }
// notes, price_as_of (defaults to today) and enabled (defaults to true) are optional.
// Run with --dry-run to validate and process images without uploading or writing.

const ITEMS_DIR = path.join(process.cwd(), "content", "items");
const ITEMS_FILE = path.join(ITEMS_DIR, "items.json");
const IMAGES_DIR = path.join(ITEMS_DIR, "images");

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type ItemInput = {
  slug: string;
  name: string;
  price_usd: number;
  image: string;
  notes?: string;
  price_as_of?: string;
  enabled?: boolean;
};

function validateItems(raw: unknown): ItemInput[] {
  if (!Array.isArray(raw)) {
    throw new Error("items.json must contain an array.");
  }

  const seen = new Set<string>();

  return raw.map((entry, index) => {
    const item = entry as Partial<ItemInput>;
    const label = `items.json entry ${index + 1} (${item.slug ?? "no slug"})`;

    if (typeof item.slug !== "string" || !SLUG_PATTERN.test(item.slug)) {
      throw new Error(
        `${label}: slug must be lowercase letters, numbers and dashes.`,
      );
    }

    if (seen.has(item.slug)) {
      throw new Error(`${label}: duplicate slug.`);
    }

    seen.add(item.slug);

    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error(`${label}: name is required.`);
    }

    if (
      typeof item.price_usd !== "number" ||
      !Number.isFinite(item.price_usd) ||
      item.price_usd <= 0
    ) {
      throw new Error(`${label}: price_usd must be a positive number.`);
    }

    if (typeof item.image !== "string" || !item.image.trim()) {
      throw new Error(`${label}: image filename is required.`);
    }

    if (
      item.price_as_of !== undefined &&
      !DATE_PATTERN.test(item.price_as_of)
    ) {
      throw new Error(`${label}: price_as_of must look like 2026-09-01.`);
    }

    return item as ItemInput;
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const items = validateItems(
    JSON.parse(await fs.readFile(ITEMS_FILE, "utf8")),
  );

  console.log(`Read ${items.length} items${dryRun ? " (dry run)" : ""}`);

  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is missing. Create a Blob store in Vercel and add its token to .env.local.",
    );
  }

  const {
    ensureEverydayItemsTable,
    getExistingItemImages,
    processItemImage,
    saveEverydayItem,
  } = await import("@/lib/items/everydayItems");

  const processed = new Map<string, ProcessedItemImage>();

  for (const item of items) {
    const imagePath = path.join(IMAGES_DIR, item.image);
    let source: Buffer;

    try {
      source = await fs.readFile(imagePath);
    } catch {
      throw new Error(`${item.slug}: image not found at ${imagePath}`);
    }

    const image = await processItemImage(source);
    processed.set(item.slug, image);
    console.log(
      `${item.slug}: ${image.width}x${image.height}, ${Math.round(image.bytes.length / 1024)}KB`,
    );
  }

  if (dryRun) {
    console.log("Dry run complete. Nothing uploaded or written.");
    return;
  }

  await ensureEverydayItemsTable();

  const existingBySlug = await getExistingItemImages();

  let uploaded = 0;

  for (const item of items) {
    const result = await saveEverydayItem({
      slug: item.slug,
      name: item.name,
      priceCents: Math.round(item.price_usd * 100),
      priceAsOf: item.price_as_of,
      notes: item.notes,
      enabled: item.enabled,
      image: processed.get(item.slug)!,
      existing: existingBySlug.get(item.slug),
    });

    if (result.uploaded) uploaded++;
  }

  console.log(
    `Done. ${items.length} items synced, ${uploaded} images uploaded, ${items.length - uploaded} unchanged.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
