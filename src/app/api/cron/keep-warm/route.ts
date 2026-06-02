import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/db";

export async function GET(req: NextRequest) {
  // Verify the request comes from Vercel Cron (not a random caller).
  // Vercel automatically sends this header on cron invocations.
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const start = Date.now();
    await sql`SELECT 1`;
    const ms = Date.now() - start;

    return NextResponse.json({ ok: true, latencyMs: ms });
  } catch (err) {
    console.error("keep-warm failed:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
