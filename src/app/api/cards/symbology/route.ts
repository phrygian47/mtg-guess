// app/api/symbology/route.ts

import { NextResponse } from "next/server";
import { sql } from "@/lib/db/db";

type CardSymbolRow = {
  symbol: string;
  svg_uri: string;
  english: string | null;
};

export async function GET() {
  try {
    const symbols = (await sql`
      SELECT symbol,
             svg_uri,
             english
      FROM card_symbols
      WHERE symbol IN ('{W}', '{U}', '{B}', '{R}', '{G}', '{C}')
        AND svg_uri IS NOT NULL
      ORDER BY symbol
    `) as CardSymbolRow[];

    return NextResponse.json(symbols);
  } catch (error) {
    console.error("Failed to fetch card symbols:", error);

    return NextResponse.json(
      { error: "Failed to fetch card symbols" },
      { status: 500 },
    );
  }
}
