import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateMemberIds() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0007_member_ids_and_points.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Running member IDs + learning points migration...");
  await sql.unsafe(migration);
  console.log("Migration complete.");
  await sql.end();
}

migrateMemberIds().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
