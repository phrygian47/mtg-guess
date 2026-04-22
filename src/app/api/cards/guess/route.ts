import { sql } from "@/lib/db/db";
import { evaluateQuestion } from "@/lib/question/evaluator";
import type { QuestionYN } from "@/lib/question/types";
import type { Card } from "@/lib/scryfall/types";

type QuestionRequest = QuestionYN & {
  timezone?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuestionRequest;
    const { timezone = "UTC", ...question } = body;

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

    const answer = evaluateQuestion(card, question);

    return Response.json({ answer });
  } catch (error) {
    console.error("POST /api/question failed:", error);

    return Response.json(
      { error: "Failed to evaluate question." },
      { status: 500 },
    );
  }
}
