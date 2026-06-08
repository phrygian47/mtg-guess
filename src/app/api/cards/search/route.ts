import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/db";

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[-/]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const query = normalize(q);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const searchPattern = query.length <= 2 ? `${query}%` : `%${query}%`;

  const cards = await sql`
    WITH searchable_cards AS (
      SELECT
          id
        , oracle_id
        , name
        , regexp_replace(normalized_name, '[-/]+', ' ', 'g') as search_name
      FROM cards
    )
    SELECT id, oracle_id, name
    FROM searchable_cards
    WHERE search_name LIKE ${searchPattern}
    ORDER BY
      CASE
        WHEN search_name = ${query} THEN 0
        WHEN search_name LIKE ${`${query}%`} THEN 1
        WHEN search_name LIKE ${`% ${query}%`} THEN 2
        ELSE 3
      END,
      LENGTH(search_name),
      name
    LIMIT 20
  `;

  return NextResponse.json(cards, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
