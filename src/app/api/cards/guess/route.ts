import { sql } from "@/lib/db/db";
import type { CardGuess } from "@/lib/question/types";
import { guessCard } from "@/lib/question/guessCard";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timezone = "UTC", oracle_id } = body;

    if (!oracle_id) {
      return Response.json({ error: "Missing oracle_id." }, { status: 400 });
    }

    const rows = await sql`
        select oracle_id, name
        from dailycardselections
        where puzzle_date = (now() at time zone ${timezone})::date
        limit 1
    `;

    const card = rows[0];

    if (!card) {
      return Response.json(
        { error: "No puzzle card found for today." },
        { status: 404 },
      );
    }

    const answer = oracle_id === card.oracle_id;
    return Response.json({ answer });
  } catch (error) {
    console.error("POST /api/question failed:", error);

    return Response.json(
      { error: "Failed to evaluate question." },
      { status: 500 },
    );
  }
}
