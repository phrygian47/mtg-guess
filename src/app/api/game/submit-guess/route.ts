import { sql } from "@/lib/db/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { timezone = "UTC", oracle_id } = body;

    if (!oracle_id) {
      return Response.json({ error: "Missing oracle_id." }, { status: 400 });
    }

    const rows = await sql`
      select
          ch.oracle_id
        , c.name
        , c.image_normal
      from card_history ch
      join cards c
        on c.oracle_id = ch.oracle_id
      where ch.puzzle_date = (now() at time zone ${timezone})::date
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

    return Response.json({
      answer,
      name: card.name,
      image_normal: card.image_normal,
    });
  } catch (error) {
    console.error("POST /api/question failed:", error);

    return Response.json(
      { error: "Failed to evaluate question." },
      { status: 500 },
    );
  }
}
