import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateLeadershipRoles() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required and must be a real connection string");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0012_leadership_roles.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Applying leadership roles migration...");
  await sql.unsafe(migration);
  await sql.end();
  console.log("Leadership roles migration applied.");
}

migrateLeadershipRoles().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
