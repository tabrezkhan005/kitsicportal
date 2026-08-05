import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("production smoke checks", () => {
  it("documents required env vars", () => {
    const envExample = join(root, ".env.example");
    expect(existsSync(envExample)).toBe(true);
    const content = readFileSync(envExample, "utf-8");
    expect(content).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not ship demo accounts panel", () => {
    const demoPanel = join(root, "apps/dashboard/features/auth/demo-accounts-panel.tsx");
    expect(existsSync(demoPanel)).toBe(false);
  });

  it("gates demo module seed behind SEED_DEMO_DATA", () => {
    const seedModules = readFileSync(
      join(root, "packages/database/src/seed-modules.ts"),
      "utf-8",
    );
    expect(seedModules).toContain('SEED_DEMO_DATA !== "true"');
  });

  it("restricts demo login resolution to development", () => {
    const authActions = readFileSync(
      join(root, "apps/dashboard/features/auth/actions.ts"),
      "utf-8",
    );
    expect(authActions).toContain('process.env.NODE_ENV === "development"');
    expect(authActions).toContain("@demo.kitsic");
  });
});
