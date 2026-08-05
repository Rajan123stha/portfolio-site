import "server-only";

import { eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { z } from "zod";

import { db } from "@/db";
import { requireAdmin } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/queries/keys";
import { reorderSchema, uuid } from "@/lib/validators/common";
import { fail, invalid, isUniqueViolation, ok, type ActionResult } from "./result";
import { applySortOrder, nextSortOrder, revalidateContent } from "./shared";

/**
 * Shared implementation for the ordered content collections.
 *
 * Core stack items, skills, experiences, highlights and the three link lists
 * all need exactly the same five operations differing only in table, schema and
 * the noun used in the confirmation message. Writing that out five times is
 * five chances for the auth check or the cache invalidation to be forgotten in
 * one of them.
 *
 * This module is intentionally *not* `"use server"`. Server-action modules may
 * only export async functions, so the factory lives here and each domain module
 * re-exports thin named wrappers around it — which also keeps action names
 * meaningful in stack traces and in the client bundle's action manifest.
 */

/** The column shape every orderable content table shares. */
type OrderedTable = PgTable & {
  id: PgColumn;
  sortOrder: PgColumn;
  updatedAt: PgColumn;
};

type CrudConfig<TSchema extends z.ZodTypeAny> = {
  table: OrderedTable;
  schema: TSchema;
  /** Lowercase singular, used verbatim in user-facing messages. */
  noun: string;
  /** Field to blame when a unique constraint rejects the write. */
  uniqueField?: string;
  uniqueMessage?: string;
};

export function createCrudActions<TSchema extends z.ZodTypeAny>({
  table,
  schema,
  noun,
  uniqueField,
  uniqueMessage,
}: CrudConfig<TSchema>) {
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);

  const duplicate = (): ActionResult<never> => {
    const message = uniqueMessage ?? `That ${noun} already exists.`;
    return fail(message, uniqueField ? { [uniqueField]: [message] } : undefined);
  };

  /**
   * Drizzle derives insert/update value types from a concrete table, which the
   * `OrderedTable` constraint deliberately erases. The Zod schema is what
   * actually guarantees the shape at runtime, so the cast is narrowed to these
   * two call sites rather than loosening the whole module.
   */
  type Row = Record<string, unknown>;

  return {
    async create(input: unknown): Promise<ActionResult<{ id: string }>> {
      await requireAdmin();

      const parsed = schema.safeParse(input);
      if (!parsed.success) return invalid(parsed.error);

      try {
        const [row] = await db
          .insert(table)
          .values({
            ...(parsed.data as Row),
            sortOrder: await nextSortOrder(table),
          } as never)
          .returning({ id: table.id });

        revalidateContent([CACHE_TAGS.content]);
        return ok({ id: row.id as string }, `${Noun} created.`);
      } catch (error) {
        if (isUniqueViolation(error)) return duplicate();
        throw error;
      }
    },

    async update(id: string, input: unknown): Promise<ActionResult> {
      await requireAdmin();

      const parsedId = uuid.safeParse(id);
      if (!parsedId.success) return fail(`Unknown ${noun}.`);

      const parsed = schema.safeParse(input);
      if (!parsed.success) return invalid(parsed.error);

      try {
        const updated = await db
          .update(table)
          .set({
            ...(parsed.data as Row),
            updatedAt: new Date(),
          } as never)
          .where(eq(table.id, parsedId.data))
          .returning({ id: table.id });

        if (updated.length === 0) return fail(`That ${noun} no longer exists.`);
      } catch (error) {
        if (isUniqueViolation(error)) return duplicate();
        throw error;
      }

      revalidateContent([CACHE_TAGS.content]);
      return ok(undefined, `${Noun} saved.`);
    },

    async remove(id: string): Promise<ActionResult> {
      await requireAdmin();

      const parsedId = uuid.safeParse(id);
      if (!parsedId.success) return fail(`Unknown ${noun}.`);

      await db.delete(table).where(eq(table.id, parsedId.data));

      revalidateContent([CACHE_TAGS.content]);
      return ok(undefined, `${Noun} deleted.`);
    },

    async reorder(input: unknown): Promise<ActionResult> {
      await requireAdmin();

      const parsed = reorderSchema.safeParse(input);
      if (!parsed.success) return invalid(parsed.error);

      await applySortOrder(table, parsed.data.ids);

      revalidateContent([CACHE_TAGS.content]);
      return ok(undefined, "Order updated.");
    },

    /** Only valid for tables carrying a `visible` column. */
    async setVisible(id: string, visible: boolean): Promise<ActionResult> {
      await requireAdmin();

      const parsedId = uuid.safeParse(id);
      if (!parsedId.success) return fail(`Unknown ${noun}.`);

      await db
        .update(table)
        .set({ visible, updatedAt: new Date() } as never)
        .where(eq(table.id, parsedId.data));

      revalidateContent([CACHE_TAGS.content]);
      return ok(undefined, visible ? `${Noun} shown.` : `${Noun} hidden.`);
    },
  };
}
