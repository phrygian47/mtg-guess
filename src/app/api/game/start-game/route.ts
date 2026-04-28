import { sql } from "@/lib/db/db";
import { StartInfo } from "@/lib/game/types";

const WORDS_TO_REMOVE = ["Basic", "Legendary"];
const pattern = `\\m(${WORDS_TO_REMOVE.join("|")})\\M`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const timezone = searchParams.get("timezone") ?? "UTC";

    const rows = await sql`
    select
        colors,
        btrim(
        regexp_replace(
            split_part(type_line, '—', 1),
            ${pattern},
            '',
            'gi'
        )
        ) as type
    from dailycardselections
    where puzzle_date = (now() at time zone ${timezone})::date
    limit 1
    `;

    const data = rows[0] as StartInfo | undefined;

    if (!data) {
      return Response.json(
        { error: "No puzzle card found for today." },
        { status: 404 },
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error("GET /api/game/start-game crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
