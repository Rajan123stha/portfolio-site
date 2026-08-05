"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { and, count, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { messages } from "@/db/schema";
import { env } from "@/lib/env";
import { contactMessageSchema } from "@/lib/validators/message";
import { fail, invalid, ok, type ActionResult } from "./result";

/** Messages allowed from one origin per rolling window. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Derives a stable, non-reversible identifier for the sender.
 *
 * Keyed with `AUTH_SECRET` rather than plain SHA-256: the IPv4 space is small
 * enough to brute-force an unkeyed digest back to the original address, which
 * would make the stored value personal data again.
 */
function hashIp(ip: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(ip).digest("hex");
}

async function requestOrigin(): Promise<{ ip: string | null; agent: string | null }> {
  const headerList = await headers();

  // `x-forwarded-for` is a client-to-origin chain; the first entry is the
  // original client. Trustworthy only because Vercel rewrites this header at
  // the edge — behind a different proxy, this needs revisiting.
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    null;

  return { ip, agent: headerList.get("user-agent")?.slice(0, 500) ?? null };
}

async function isRateLimited(ipHash: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);

  const [row] = await db
    .select({ total: count() })
    .from(messages)
    .where(and(eq(messages.ipHash, ipHash), gte(messages.createdAt, since)));

  return (row?.total ?? 0) >= RATE_LIMIT;
}

/**
 * Public contact-form submission.
 *
 * Unauthenticated by definition, so it carries its own defences: strict schema
 * bounds, a honeypot field, and a per-origin rate limit. Next.js already
 * rejects cross-origin server-action invocations, which covers CSRF.
 */
export async function submitContactMessage(
  input: unknown,
): Promise<ActionResult> {
  const parsed = contactMessageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { name, email, message, website } = parsed.data;

  // Honeypot: only an automated client fills a field humans can't see.
  // Reported as success so the bot has no signal to adapt to.
  if (website) return ok(undefined, "Thanks — your message has been sent.");

  const { ip, agent } = await requestOrigin();
  const ipHash = ip ? hashIp(ip) : null;

  if (ipHash && (await isRateLimited(ipHash))) {
    return fail(
      "You've sent several messages recently. Please try again in an hour.",
    );
  }

  try {
    await db.insert(messages).values({
      name,
      email,
      body: message,
      ipHash,
      userAgent: agent,
    });
  } catch (error) {
    console.error("Failed to store contact message", error);
    return fail("Something went wrong on our end. Please try again shortly.");
  }

  return ok(undefined, "Thanks — your message has been sent.");
}
