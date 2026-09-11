"use server";

import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { DEFAULT_SITE_SETTINGS } from "@/lib/content/defaults";
import { CACHE_TAGS } from "@/lib/queries/keys";
import { assistantSettingsSchema } from "@/lib/validators/content";
import { invalid, ok, type ActionResult } from "./result";
import { revalidateContent } from "./shared";

/**
 * AI assistant settings — stored on the `site_settings` singleton, but edited
 * on their own admin page, so they write only their own columns and never
 * clobber branding or SEO saved from the settings form.
 */

type AssistantPatch = Partial<
  Pick<
    typeof siteSettings.$inferInsert,
    "assistantEnabled" | "assistantWelcome" | "assistantQuestions" | "assistantPronouns"
  >
>;

/**
 * Upsert rather than update: a migrated-but-unseeded database has no settings
 * row yet, and an update would silently change nothing.
 */
async function saveAssistant(patch: AssistantPatch): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ ...DEFAULT_SITE_SETTINGS, ...patch, id: 1 })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: { ...patch, updatedAt: new Date() },
    });

  revalidateContent([CACHE_TAGS.settings]);
}

/** The on/off switch, used directly from the status card. */
export async function setAssistantEnabled(enabled: boolean): Promise<ActionResult> {
  await requireAdmin();

  await saveAssistant({ assistantEnabled: enabled === true });

  return ok(
    undefined,
    enabled ? "Assistant switched on." : "Assistant switched off.",
  );
}

export async function updateAssistantSettings(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = assistantSettingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await saveAssistant(parsed.data);

  return ok(undefined, "Assistant settings saved.");
}
