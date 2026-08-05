import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * `drizzle-kit generate` diffs the schema offline and never opens a connection,
 * so it must stay runnable before a database exists. The placeholder keeps that
 * path working; `migrate`, `push` and `studio` all fail loudly against it,
 * which is the correct outcome when `DATABASE_URL` really is missing.
 */
const url =
  process.env.DATABASE_URL ?? "postgresql://placeholder/placeholder";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
