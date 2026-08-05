import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;

  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error(
      "DATABASE_URL is not configured. Use Supabase Admin API paths or set a valid DATABASE_URL in apps/dashboard/.env.local",
    );
  }

  if (!client) {
    client = postgres(url, { prepare: false });
  }

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
