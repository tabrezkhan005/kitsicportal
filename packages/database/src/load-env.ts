import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPaths = [
  resolve(process.cwd(), "../../apps/dashboard/.env.local"),
  resolve(process.cwd(), "../../.env.local"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
];

for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return raw.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}

export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to the repo root .env.local",
    );
  }
  return key;
}
