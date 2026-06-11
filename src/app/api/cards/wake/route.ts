import { sql } from "@/lib/db/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await sql`SELECT 1`;

    return new NextResponse(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Wake endpoint failed:", error);

    return new NextResponse(null, {
      status: 500,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
