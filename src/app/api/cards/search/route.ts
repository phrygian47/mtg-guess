import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/db";

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s/-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const query = normalize(q);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const cards = await sql`
  WITH ranked_cards AS (
    SELECT
      id,
      name,
      normalized_name,
      CASE
        WHEN normalized_name = ${query} THEN 0
        WHEN normalized_name LIKE ${`${query}%`} THEN 1
        WHEN normalized_name ILIKE ${`% ${query}%`} THEN 2
        ELSE 3
      END AS match_rank,
      ROW_NUMBER() OVER (
        PARTITION BY name
        ORDER BY
          CASE
            WHEN normalized_name = ${query} THEN 0
            WHEN normalized_name LIKE ${`${query}%`} THEN 1
            WHEN normalized_name ILIKE ${`% ${query}%`} THEN 2
            ELSE 3
          END,
          LENGTH(normalized_name) ASC,
          id ASC
      ) AS rn
    FROM cards
    WHERE normalized_name ILIKE ${`%${query}%`}
  )
  SELECT id, name
  FROM ranked_cards
  WHERE rn = 1
  ORDER BY
    match_rank ASC,
    LENGTH(normalized_name) ASC,
    name ASC
  LIMIT 20
`;

  return NextResponse.json(cards);
}
