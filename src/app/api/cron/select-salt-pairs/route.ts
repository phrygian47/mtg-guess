import { fillSaltScoreSelections } from "@/lib/game/saltScorePairs";
import { ok } from "assert";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await fillSaltScoreSelections({
      daysToPregenerate: 3,
    });

    return Response.json({
      ok: true,
      createdCount: result.createdSelections.length,
      reusedCount: result.reusedSelections.length,
      missingCount: result.missingSelections.length,
      createdSelections: result.createdSelections.map((selection) => ({
        id: selection.id,
        mode: selection.mode,
        puzzle_date: selection.puzzle_date,
        pairCount: selection.pairs.length,
      })),
      reusedSelections: result.reusedSelections.map((selection) => ({
        id: selection.id,
        mode: selection.mode,
        puzzle_date: selection.puzzle_date,
        pairCount: selection.pairs.length,
      })),
      missingSelections: result.missingSelections,
    });
  } catch (error) {
    console.error("Salt score pair select failed: ", error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown Error",
      },
      { status: 500 },
    );
  }
}
