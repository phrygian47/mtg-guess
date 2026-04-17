import { neon } from "@neondatabase/serverless";
import { error } from "console";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found");
}

export const sql = neon(process.env.DATABASE_URL);
