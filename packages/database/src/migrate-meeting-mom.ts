import "./load-env";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrateMeetingMom() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("[ref]") || url.includes("[password]")) {
    throw new Error("DATABASE_URL is required and must be a real connection string");
  }

  const sql = postgres(url, { prepare: false, max: 1 });
  const migrationPath = join(__dirname, "../supabase/migrations/0011_meeting_mom.sql");
  const migration = readFileSync(migrationPath, "utf-8");

  console.log("Applying meeting MOM migration...");
  await sql.unsafe(migration);
  await sql.end();
  console.log("Meeting MOM migration applied.");
}

migrateMeetingMom().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
