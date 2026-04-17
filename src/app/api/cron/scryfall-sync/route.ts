import { importScryfallCards } from "@/lib/scryfall/scryfall-import";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await importScryfallCards();
    return Response.json({ ok: true, result });
  } catch (error) {
    console.error("Cron sync failed:", error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
// import { sql } from "@/lib/db/db";

// export async function GET(req: Request) {
//   const auth = req.headers.get("authorization");

//   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response("Unauthorized", { status: 401 });
//   }

//   try {
//     const result = await sql`select now() as now`;
//     return Response.json({ ok: true, db: result[0] });
//   } catch (error) {
//     return Response.json(
//       {
//         ok: false,
//         error: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     );
//   }
// }
