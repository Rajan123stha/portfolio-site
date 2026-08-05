import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { readSession, type SessionPayload } from "./session";

/**
 * Full session resolution: verify the JWT, then confirm it hasn't been revoked.
 *
 * `middleware.ts` only checks the signature, because the Edge runtime can't
 * reach the database. That's enough to keep unauthenticated traffic out of
 * /admin, but it would still honour a token issued before a password change.
 * Every server component and server action therefore re-resolves through here,
 * where the token's `tokenVersion` is compared against the stored one.
 *
 * `cache()` deduplicates the query across a single render pass, so a page and
 * all of its nested layouts share one round-trip.
 */
export const getCurrentAdmin = cache(
  async (): Promise<SessionPayload | null> => {
    const session = await readSession();
    if (!session) return null;

    const [user] = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        tokenVersion: adminUsers.tokenVersion,
      })
      .from(adminUsers)
      .where(eq(adminUsers.id, session.userId))
      .limit(1);

    if (!user || user.tokenVersion !== session.tokenVersion) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion,
    };
  },
);

/**
 * Use at the top of every admin page and server action.
 *
 * Redirecting rather than returning `null` means a caller can never forget to
 * handle the unauthenticated branch — the function simply doesn't return.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
