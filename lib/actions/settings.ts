"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profile, sections, siteSettings, type SectionKey } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { CACHE_TAGS } from "@/lib/queries/keys";
import {
  profileSchema,
  sectionSchema,
  siteSettingsSchema,
} from "@/lib/validators/content";
import { invalid, ok, type ActionResult } from "./result";
import { revalidateContent } from "./shared";

/**
 * Singleton editors.
 *
 * Each write is an upsert on `id = 1` rather than an update: the row is
 * guaranteed unique by a CHECK constraint, and upserting means a database that
 * was migrated but not seeded still accepts its first save instead of silently
 * updating zero rows.
 */

export async function updateSiteSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const values = { ...parsed.data, id: 1, updatedAt: new Date() };

  await db
    .insert(siteSettings)
    .values(values)
    .onConflictDoUpdate({ target: siteSettings.id, set: values });

  revalidateContent();
  return ok(undefined, "Site settings saved.");
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const values = { ...parsed.data, id: 1, updatedAt: new Date() };

  await db
    .insert(profile)
    .values(values)
    .onConflictDoUpdate({ target: profile.id, set: values });

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Profile saved.");
}

/** Updates one section's header block. The key comes from the route, not the form. */
export async function updateSection(
  key: SectionKey,
  input: unknown,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = sectionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const values = { ...parsed.data, key, updatedAt: new Date() };

  await db
    .insert(sections)
    .values(values)
    .onConflictDoUpdate({ target: sections.key, set: values });

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, "Section saved.");
}

/** Show/hide toggle used directly from the sections list. */
export async function toggleSectionVisibility(
  key: SectionKey,
  visible: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  await db
    .update(sections)
    .set({ visible, updatedAt: new Date() })
    .where(eq(sections.key, key));

  revalidateContent([CACHE_TAGS.content]);
  return ok(undefined, visible ? "Section shown." : "Section hidden.");
}
