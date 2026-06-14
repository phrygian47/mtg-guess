import { sql } from "@/lib/db/db";

const MODE = "art";
const RULES_TEXT_HINT_GUESS_COUNT = 6;
const SET_AND_MANA_HINT_GUESS_COUNT = 10;

type ArtAnswerRow = {
  oracle_id: string;
  name: string;
  image_normal: string | null;
  art_crop: string | null;
  oracle_text: string | null;
  mana_cost: string | null;
  set_name: string | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const timezone = normalizeTimezone(body.timezone);
    const oracleId = normalizeString(body.oracle_id);
    const guessCount = normalizeGuessCount(body.guess_count);

    if (!oracleId) {
      return Response.json({ error: "Missing oracle_id." }, { status: 400 });
    }

    const rows = (await sql`
      select
          dp.oracle_id
        , c.name
        , c.image_normal
        , c.art_crop
        , c.oracle_text
        , c.mana_cost
        , c.set_name
      from daily_puzzles dp
      join cards c
        on c.oracle_id = dp.oracle_id
      where dp.mode = ${MODE}
        and dp.puzzle_date = (now() at time zone ${timezone})::date
      limit 1
    `) as ArtAnswerRow[];

    const card = rows[0];

    if (!card) {
      return Response.json(
        { error: "No art puzzle found for today." },
        { status: 404 },
      );
    }

    const answer = oracleId.toLowerCase() === card.oracle_id.toLowerCase();

    if (answer) {
      return Response.json({
        answer,
        name: card.name,
        image_normal: card.image_normal,
        art_crop: card.art_crop,
      });
    }

    const shouldShowSetAndManaHint =
      guessCount >= SET_AND_MANA_HINT_GUESS_COUNT;

    const shouldShowRulesHint = guessCount >= RULES_TEXT_HINT_GUESS_COUNT;

    return Response.json({
      answer,
      set_name: shouldShowSetAndManaHint ? card.set_name : undefined,
      mana_cost: shouldShowSetAndManaHint ? card.mana_cost : undefined,
      oracle_text: shouldShowRulesHint ? card.oracle_text : undefined,
    });
  } catch (error) {
    console.error("POST /api/art/submit-guess crashed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeTimezone(value: unknown): string {
  if (typeof value !== "string") {
    return "UTC";
  }

  return value.trim() || "UTC";
}

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeGuessCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}
