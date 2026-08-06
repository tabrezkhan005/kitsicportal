import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "node:path";

// Monorepo: load shared env from repo root (single .env.local for everything)
config({ path: resolve(__dirname, "../../.env.local") });

const nextConfig: NextConfig = {
  transpilePackages: [
    "@kitsic/ui",
    "@kitsic/auth",
    "@kitsic/database",
    "@kitsic/types",
    "@kitsic/utils",
    "@kitsic/hooks",
    "@excalidraw/excalidraw",
  ],
  experimental: {
    serverActions: {
      // Avatars up to 5 MB; club documents up to 15 MB (see lib/storage.ts)
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
