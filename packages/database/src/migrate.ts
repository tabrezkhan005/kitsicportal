import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0001_foundation.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Running foundation migration...");
  await sql.unsafe(migration);
  console.log("Migration complete.");
  await sql.end();
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
