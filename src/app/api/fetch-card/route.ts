import { sql } from "@/lib/db/db";
import type { QuestionYN } from "@/lib/question/types";
import type { Card } from "@/lib/scryfall/types";

type QuestionRequest = QuestionYN & {
  timezone?: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = searchParams.get("timezone") ?? "UTC";

    const rows = await sql`
      select *
      from dailycardselections
      where puzzle_date = (now() at time zone ${timezone})::date
      limit 1
    `;

    const card = rows[0] as Card | undefined;

    if (!card) {
      return Response.json(
        { error: "No puzzle card found for today." },
        { status: 404 },
      );
    }

    return Response.json(card);
  } catch (err) {
    console.error("GET /api/fetch-card crashed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
