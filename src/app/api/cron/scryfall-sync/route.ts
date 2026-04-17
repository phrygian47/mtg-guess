import { importScryfallCards } from "@/lib/scryfall/scryfall-import";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await importScryfallCards();
  return Response.json(result);
}
