"use server";

import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { getCurrentAdmin, requireAdmin } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth/session";
import {
  accountSchema,
  changePasswordSchema,
  loginSchema,
} from "@/lib/validators/auth";
import { fail, invalid, isUniqueViolation, ok, type ActionResult } from "./result";

/**
 * Deliberately vague. Distinguishing "no such account" from "wrong password"
 * turns the login form into an account-enumeration oracle.
 */
const INVALID_CREDENTIALS = "Email or password is incorrect.";

/**
 * Only internal paths are honoured as a post-login destination. Reflecting an
 * arbitrary `?next=` value into a redirect is an open-redirect vector —
 * `//evil.com` is a protocol-relative URL that browsers treat as external.
 */
function safeRedirect(target: string | undefined): string {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/admin";
  }
  return target;
}

export async function login(
  input: unknown,
  next?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { email, password } = parsed.data;

  const [user] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      passwordHash: adminUsers.passwordHash,
      tokenVersion: adminUsers.tokenVersion,
    })
    .from(adminUsers)
    .where(eq(sql`lower(${adminUsers.email})`, email.toLowerCase()))
    .limit(1);

  if (!user) {
    // Hash a throwaway value anyway. Returning early would make a missing
    // account measurably faster than a wrong password, which leaks the same
    // information the generic message is there to hide.
    await hashPassword(password);
    return fail(INVALID_CREDENTIALS);
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return fail(INVALID_CREDENTIALS);
  }

  await db
    .update(adminUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(adminUsers.id, user.id));

  await setSessionCookie(
    await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenVersion: user.tokenVersion,
    }),
  );

  // `redirect` throws a control-flow signal, so nothing after it runs.
  redirect(safeRedirect(next));
}

export async function logout(): Promise<never> {
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function updateAccount(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  try {
    await db
      .update(adminUsers)
      .set({
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, admin.userId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("That email is already in use.", {
        email: ["That email is already in use."],
      });
    }
    throw error;
  }

  // The session carries the display name, so it has to be reissued.
  await setSessionCookie(
    await signSessionToken({
      userId: admin.userId,
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      tokenVersion: admin.tokenVersion,
    }),
  );

  return ok(undefined, "Account updated.");
}

/**
 * Changing the password bumps `tokenVersion`, which invalidates every session
 * issued before now — including any an attacker might be holding. The current
 * browser is then re-issued a fresh token so the user isn't logged out of the
 * device they just used.
 */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const [user] = await db
    .select({ passwordHash: adminUsers.passwordHash })
    .from(adminUsers)
    .where(eq(adminUsers.id, admin.userId))
    .limit(1);

  if (!user) return fail("Account not found.");

  if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return fail("Your current password is incorrect.", {
      currentPassword: ["Your current password is incorrect."],
    });
  }

  const nextTokenVersion = admin.tokenVersion + 1;

  await db
    .update(adminUsers)
    .set({
      passwordHash: await hashPassword(parsed.data.newPassword),
      tokenVersion: nextTokenVersion,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.id, admin.userId));

  await setSessionCookie(
    await signSessionToken({
      userId: admin.userId,
      email: admin.email,
      name: admin.name,
      tokenVersion: nextTokenVersion,
    }),
  );

  return ok(undefined, "Password changed. Other sessions were signed out.");
}

/** Invalidates every session, this browser included. */
export async function signOutEverywhere(): Promise<never> {
  const admin = await getCurrentAdmin();

  if (admin) {
    await db
      .update(adminUsers)
      .set({ tokenVersion: admin.tokenVersion + 1, updatedAt: new Date() })
      .where(eq(adminUsers.id, admin.userId));
  }

  await clearSessionCookie();
  redirect("/admin/login");
}
