import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { env } from "@/lib/env";
import * as schema from "./schema";

/**
 * Drizzle client backed by Neon's HTTP driver.
 *
 * HTTP (rather than the WebSocket/pooled driver) is the right fit here: every
 * query in this app is a short, self-contained read or write, and HTTP keeps no
 * connection alive between serverless invocations. The trade-off is no
 * interactive transactions — the one place that matters, rewriting `sort_order`
 * across a reordered list, is handled by a single atomic statement instead.
 */
type Database = ReturnType<typeof createClient>;

function createClient() {
  return drizzle(neon(env.DATABASE_URL), {
    schema,
    casing: "snake_case",
    logger: process.env.DRIZZLE_LOG === "true",
  });
}

/** Cached on `globalThis` so dev-server hot reloads don't pile up clients. */
const globalForDb = globalThis as unknown as { db?: Database };

function getClient(): Database {
  if (!globalForDb.db) globalForDb.db = createClient();
  return globalForDb.db;
}

/**
 * Constructed on first use, not at import.
 *
 * `next build` walks every route, and this module is reachable from the root
 * layout, so connecting eagerly would make routes that never query the database
 * — `/_not-found`, for one — fail the build when `DATABASE_URL` is absent.
 * Deferring means a missing variable is reported by the query that actually
 * needed it.
 */
export const db: Database = new Proxy({} as Database, {
  get: (_target, key) => {
    const client = getClient() as unknown as Record<PropertyKey, unknown>;
    const value = client[key];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { schema };
