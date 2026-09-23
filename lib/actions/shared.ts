import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTableName, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { ALL_CACHE_TAGS, CACHE_TAGS, type CacheTag } from "@/lib/queries/keys";

/**
 * Drops the public site's cached content after a mutation.
 *
 * Call this at the end of every write. `revalidateTag` clears the data-cache
 * entries in `lib/queries/public.ts`; `revalidatePath` additionally discards
 * the statically rendered pages, which is what makes an edit visible on the
 * very next request.
 *
 * The whole layout is revalidated rather than just "/": the homepage, every
 * project page, the projects index, the sitemap and the share images are all
 * built from the same content, and any edit can change several of them.
 */
export function revalidateContent(tags: CacheTag[] = ALL_CACHE_TAGS): void {
  for (const tag of tags) revalidateTag(tag);
  revalidatePath("/", "layout");
}

export { CACHE_TAGS };

/**
 * Rewrites `sort_order` to match the order of `ids`.
 *
 * Issued as one `UPDATE … FROM (VALUES …)` rather than a loop of updates: the
 * Neon HTTP driver has no interactive transactions, so N separate statements
 * could leave the list half-reordered if one failed midway. A single statement
 * is atomic on its own.
 *
 * The table name is resolved through Drizzle's metadata and the column names
 * are literals, so nothing user-supplied reaches the SQL text — only the ids,
 * which are bound as parameters.
 */
export async function applySortOrder(
  table: PgTable,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;

  /**
   * `position` needs its own cast, same as `id` — Neon's HTTP driver sends
   * every parameter with an explicit type, which for a plain JS number is
   * `text`. Left uncast, Postgres has no "unknown"-literal leeway to coerce
   * that into the integer `sort_order` column expects and rejects the whole
   * statement with "column is of type integer but expression is of type
   * text", which made every drag-to-reorder fail — for every list this
   * function backs, not just this one — the moment it reached the database.
   */
  const pairs = sql.join(
    ids.map((id, index) => sql`(${id}::uuid, ${index}::int)`),
    sql`, `,
  );

  await db.execute(sql`
    UPDATE ${sql.identifier(getTableName(table))} AS target
    SET sort_order = source.position, updated_at = now()
    FROM (VALUES ${pairs}) AS source(id, position)
    WHERE target.id = source.id
  `);
}

/**
 * Places a new row at the end of its list.
 *
 * A gap-free sequence isn't required — only a stable ascending order — so
 * `max + 1` is enough and avoids renumbering siblings on every insert.
 */
export async function nextSortOrder(table: PgTable): Promise<number> {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(sort_order) + 1, 0)::int` })
    .from(table);

  return row?.next ?? 0;
}
