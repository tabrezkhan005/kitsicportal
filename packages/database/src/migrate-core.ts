import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  "0002_core_modules.sql",
  "0003_extended_modules.sql",
  "0004_task_boards_whiteboard.sql",
];

async function migrateCore() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  for (const file of MIGRATIONS) {
    const migrationPath = join(__dirname, "../supabase/migrations", file);
    const migration = readFileSync(migrationPath, "utf-8");
    console.log(`Running ${file}...`);
    try {
      await sql.unsafe(migration);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("already exists")) {
        console.log(`  Skipping ${file} (already applied)`);
        continue;
      }
      throw error;
    }
  }

  console.log("Core migrations complete.");
  await sql.end();
}

migrateCore().catch((error) => {
  console.error("Core migration failed:", error);
  process.exit(1);
});
