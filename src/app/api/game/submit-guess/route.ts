import { sql } from "@/lib/db/db";

const MODE = "classic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timezone = "UTC", oracle_id } = body;

    if (!oracle_id) {
      return Response.json({ error: "Missing oracle_id." }, { status: 400 });
    }

    const rows = await sql`
      select
          dp.oracle_id
        , c.name
        , c.image_normal
      from daily_puzzles dp
      join cards c
        on c.oracle_id = dp.oracle_id
      where dp.mode = ${MODE}
        and dp.puzzle_date = (now() at time zone ${timezone})::date
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

    if (answer) {
      return Response.json({
        answer,
        name: card.name,
        image_normal: card.image_normal,
      });
    }

    return Response.json({
      answer,
    });
  } catch (error) {
    console.error("POST /api/question failed:", error);

    return Response.json(
      { error: "Failed to evaluate question." },
      { status: 500 },
    );
  }
}
