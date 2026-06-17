import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
async function main() {
  const { ImportCards } = await import("@/lib/imports/import-cards");

  const result = await ImportCards();
  console.log(result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
