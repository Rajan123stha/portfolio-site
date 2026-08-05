"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { projectCategories, projects } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/queries/keys";
import { reorderSchema, uuid } from "@/lib/validators/common";
import {
  projectCategorySchema,
  projectSchema,
} from "@/lib/validators/content";
import {
  fail,
  invalid,
  isUniqueViolation,
  ok,
  type ActionResult,
} from "./result";
import { applySortOrder, nextSortOrder, revalidateContent } from "./shared";

/** Slugs are public identifiers, so a collision needs a field-level message. */
const DUPLICATE_SLUG = "Another project already uses that slug.";

export async function createProject(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const [row] = await db
      .insert(projects)
      .values({ ...parsed.data, sortOrder: await nextSortOrder(projects) })
      .returning({ id: projects.id });

    revalidateContent([CACHE_TAGS.content]);
    return ok({ id: row.id }, "Project created.");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(DUPLICATE_SLUG, { slug: [DUPLICATE_SLUG] });
    }
    throw error;
  }
}

export async function updateProject(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown project.");

  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    const updated = await db
      .update(projects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projects.id, parsedId.data))
      .returning({ id: projects.id });

    if (updated.length === 0) return fail("That project no longer exists.");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(DUPLICATE_SLUG, { slug: [DUPLICATE_SLUG] });
    }
    throw error;
  }

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Project saved.");
}

export async function deleteProject(id: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown project.");

  await db.delete(projects).where(eq(projects.id, parsedId.data));

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Project deleted.");
}

/** Quick show/hide from the list, without opening the editor. */
export async function toggleProjectVisibility(
  id: string,
  visible: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown project.");

  await db
    .update(projects)
    .set({ visible, updatedAt: new Date() })
    .where(eq(projects.id, parsedId.data));

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, visible ? "Project is now live." : "Project hidden.");
}

export async function reorderProjects(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await applySortOrder(projects, parsed.data.ids);

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Order updated.");
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function createProjectCategory(
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = projectCategorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db.insert(projectCategories).values({
      ...parsed.data,
      sortOrder: await nextSortOrder(projectCategories),
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("That category slug is taken.", {
        slug: ["That category slug is taken."],
      });
    }
    throw error;
  }

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Category created.");
}

export async function updateProjectCategory(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown category.");

  const parsed = projectCategorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db
      .update(projectCategories)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(projectCategories.id, parsedId.data));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("That category slug is taken.", {
        slug: ["That category slug is taken."],
      });
    }
    throw error;
  }

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Category saved.");
}

/**
 * Deleting a category leaves its projects in place — the foreign key is
 * `ON DELETE SET NULL`, so they become uncategorised rather than disappearing
 * along with a filter tab.
 */
export async function deleteProjectCategory(id: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown category.");

  await db.delete(projectCategories).where(eq(projectCategories.id, parsedId.data));

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Category deleted. Its projects are now uncategorised.");
}

export async function reorderProjectCategories(
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await applySortOrder(projectCategories, parsed.data.ids);

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Order updated.");
}
