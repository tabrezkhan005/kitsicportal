import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateStorage() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0006_storage_buckets.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Running storage buckets migration...");
  await sql.unsafe(migration);
  console.log("Storage migration complete.");
  await sql.end();
}

migrateStorage().catch((error) => {
  console.error("Storage migration failed:", error);
  process.exit(1);
});
