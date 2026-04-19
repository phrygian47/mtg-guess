import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
async function main() {
  const { importScryfallCards } =
    await import("@/lib/scryfall/scryfall-import");

  const result = await importScryfallCards();
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
