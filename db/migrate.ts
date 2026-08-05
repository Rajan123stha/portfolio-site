import { config } from "dotenv";

config({ path: ".env.local" });

/**
 * Applies pending migrations.
 *
 * Imports are dynamic so `dotenv` populates `process.env` before `lib/env`
 * validates it — a static import would be hoisted above the `config()` call and
 * fail on a perfectly valid `.env.local`.
 */
async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — see .env.example");
  }

  const db = drizzle(neon(url));

  console.log("→ applying migrations…");
  await migrate(db, { migrationsFolder: "./db/migrations" });
  console.log("✓ database is up to date");
}

main().catch((error) => {
  console.error("✗ migration failed\n", error);
  process.exit(1);
});
