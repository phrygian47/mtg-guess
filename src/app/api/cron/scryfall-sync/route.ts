// import { importScryfallCards } from "@/lib/scryfall/scryfall-import";

// export async function GET(req: Request) {
//   const auth = req.headers.get("authorization");

//   if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
//     return new Response("Unauthorized", { status: 401 });
//   }

//   try {
//     const result = await importScryfallCards();
//     return Response.json({ ok: true, result });
//   } catch (error) {
//     console.error("Cron sync failed:", error);

//     return Response.json(
//       {
//         ok: false,
//         error: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     );
//   }
// }

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const bulkRes = await fetch("https://api.scryfall.com/bulk-data", {
      cache: "no-store",
    });

    const bulkJson = await bulkRes.json();

    return Response.json({
      ok: true,
      bulkOk: bulkRes.ok,
      types: bulkJson.data?.slice(0, 5)?.map((x: { type: string }) => x.type),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
