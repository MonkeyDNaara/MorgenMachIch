import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same .env.local the app uses (drizzle-kit doesn't load it on its own).
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is missing — see .env.example.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  // Migrations run over the direct connection, never the pooler.
  dbCredentials: { url },
  // Only our own tables; Neon Auth manages `neon_auth` (#306).
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
