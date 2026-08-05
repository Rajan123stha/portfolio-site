"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { messages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import { uuid } from "@/lib/validators/common";
import { fail, invalid, ok, type ActionResult } from "./result";

/**
 * Inbox management.
 *
 * Only `/admin/messages` is revalidated — message state never appears on the
 * public site, so there is nothing in the content cache to drop.
 */

const idsSchema = z.object({ ids: z.array(uuid).min(1, "Nothing selected") });

function refreshInbox() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

export async function setMessageRead(
  id: string,
  isRead: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown message.");

  await db
    .update(messages)
    .set({ isRead })
    .where(eq(messages.id, parsedId.data));

  refreshInbox();
  return ok(undefined, isRead ? "Marked as read." : "Marked as unread.");
}

/**
 * Archiving rather than deleting is the default action in the UI: an enquiry
 * that turns out to matter months later is unrecoverable once deleted.
 */
export async function setMessageArchived(
  id: string,
  isArchived: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown message.");

  await db
    .update(messages)
    .set({ isArchived, isRead: isArchived ? true : undefined })
    .where(eq(messages.id, parsedId.data));

  refreshInbox();
  return ok(undefined, isArchived ? "Archived." : "Restored to inbox.");
}

export async function markAllRead(input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await db
    .update(messages)
    .set({ isRead: true })
    .where(inArray(messages.id, parsed.data.ids));

  refreshInbox();
  return ok(undefined, "All messages marked as read.");
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown message.");

  await db.delete(messages).where(eq(messages.id, parsedId.data));

  refreshInbox();
  return ok(undefined, "Message deleted.");
}
