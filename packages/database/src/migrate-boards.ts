import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateBoards() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required and must be a real connection string");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0004_task_boards_whiteboard.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Running task boards + whiteboard migration...");
  await sql.unsafe(migration);
  console.log("Migration complete.");
  await sql.end();
}

migrateBoards().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
