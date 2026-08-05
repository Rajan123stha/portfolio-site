"use server";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { media } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/guard";
import {
  cloudinary,
  createUploadSignature,
  ensureConfigured,
  isCloudinaryConfigured,
  type UploadSignature,
} from "@/lib/cloudinary";
import { uuid } from "@/lib/validators/common";
import { mediaSchema } from "@/lib/validators/content";
import { fail, invalid, ok, type ActionResult } from "./result";
import { revalidateContent } from "./shared";

/**
 * Issues a short-lived signature for a direct browser→Cloudinary upload.
 * Admin-only: without the guard this would be an open upload endpoint against
 * the account's quota.
 */
export async function getUploadSignature(): Promise<
  ActionResult<UploadSignature>
> {
  await requireAdmin();

  if (!isCloudinaryConfigured()) {
    return fail(
      "Image uploads aren't configured yet. Add your Cloudinary keys to .env.local.",
    );
  }

  try {
    return ok(createUploadSignature());
  } catch (error) {
    console.error("Failed to sign Cloudinary upload", error);
    return fail("Couldn't prepare the upload. Please try again.");
  }
}

/**
 * Records an asset after Cloudinary confirms it.
 *
 * The upload itself never touches this server, so this is what gives the media
 * library something to list. `publicId` is unique, so a retried save updates
 * the existing row instead of creating a duplicate.
 */
export async function registerUpload(input: unknown): Promise<
  ActionResult<{ id: string; url: string }>
> {
  await requireAdmin();

  const parsed = mediaSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const [row] = await db
    .insert(media)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: media.publicId,
      set: { url: parsed.data.url, alt: parsed.data.alt },
    })
    .returning({ id: media.id, url: media.url });

  return ok({ id: row.id, url: row.url });
}

export async function listMedia() {
  await requireAdmin();

  return db
    .select()
    .from(media)
    .orderBy(desc(media.createdAt))
    .limit(60);
}

export async function updateMediaAlt(
  id: string,
  alt: string,
): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown asset.");

  await db
    .update(media)
    .set({ alt: alt.trim().slice(0, 200) })
    .where(eq(media.id, parsedId.data));

  return ok(undefined, "Alt text saved.");
}

/**
 * Removes an asset from Cloudinary and the library.
 *
 * Cloudinary is deleted first: if that call fails the row survives, so the
 * asset stays visible and can be retried. The reverse order would orphan a file
 * that nothing in the app can reach.
 *
 * Content already referencing the image keeps its stored URL, which will now
 * 404 — that's why the confirmation dialog says so.
 */
export async function deleteMedia(id: string): Promise<ActionResult> {
  await requireAdmin();

  const parsedId = uuid.safeParse(id);
  if (!parsedId.success) return fail("Unknown asset.");

  const [asset] = await db
    .select({ publicId: media.publicId })
    .from(media)
    .where(eq(media.id, parsedId.data))
    .limit(1);

  if (!asset) return fail("That asset no longer exists.");

  if (ensureConfigured()) {
    try {
      await cloudinary.uploader.destroy(asset.publicId);
    } catch (error) {
      console.error("Cloudinary delete failed", error);
      return fail("Couldn't remove the file from Cloudinary. Nothing was deleted.");
    }
  }

  await db.delete(media).where(eq(media.id, parsedId.data));

  revalidateContent();
  return ok(undefined, "Asset deleted.");
}
