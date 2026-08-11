import "server-only";

import { createHmac } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Turning a raw request into a privacy-preserving analytics row.
 *
 * The guiding rule: store the smallest thing that answers "how many people,
 * from where, on what". Anything that could re-identify a visitor later is
 * either discarded or reduced to a salt-rotated hash before it reaches the
 * database.
 */

export type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

/**
 * Obvious crawlers, so the numbers reflect people.
 *
 * Deliberately conservative — it only matches agents that announce themselves.
 * Over-matching would quietly discard real visitors, which is a worse failure
 * than counting the occasional unlabelled bot.
 */
const BOT_PATTERN =
  /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|lighthouse|pagespeed|headless|monitor|uptime|curl|wget|python-requests|axios|node-fetch|go-http/i;

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // No UA at all is far more often a script.
  return BOT_PATTERN.test(userAgent);
}

export function detectDevice(userAgent: string | null): DeviceType {
  if (!userAgent) return "unknown";
  // Tablets first: iPads and Android tablets also match the mobile pattern.
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(userAgent)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Reduces a referrer to its bare host.
 *
 * The full URL is dropped on purpose: the page someone came from can leak a
 * search query or a private document title, and "google.com" answers the
 * question just as well.
 */
export function referrerHost(
  referrer: string | null,
  ownHost: string | null,
): string | null {
  if (!referrer) return null;

  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    // Internal navigation isn't a referral.
    if (ownHost && host === ownHost.replace(/^www\./, "")) return null;
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Daily-rotating visitor hash.
 *
 * Keyed with `AUTH_SECRET` plus the current UTC date, so the same person gets a
 * different hash tomorrow. Unique-visitor counts stay accurate within a day
 * while the stored value is useless for tracking anyone over time — and because
 * it's an HMAC rather than a plain digest, the small IPv4 space can't be
 * brute-forced back to an address.
 */
export function hashVisitor(
  ip: string | null,
  userAgent: string | null,
  now = new Date(),
): string {
  const day = now.toISOString().slice(0, 10);
  return createHmac("sha256", `${env.AUTH_SECRET}:${day}`)
    .update(`${ip ?? "unknown"}|${userAgent ?? "unknown"}`)
    .digest("hex");
}

/**
 * Client IP from the proxy chain.
 *
 * `x-forwarded-for` is a client-to-origin list, so the first entry is the
 * original client. Trustworthy only because the platform edge rewrites this
 * header; behind a different proxy this needs revisiting.
 */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  return (
    forwarded?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    null
  );
}

/** Only same-origin, root-relative paths are recorded. */
export function normalisePath(input: unknown): string | null {
  if (typeof input !== "string" || !input.startsWith("/")) return null;
  // Query strings and fragments add noise without adding insight here.
  const path = input.split(/[?#]/)[0];
  return path.length > 512 ? path.slice(0, 512) : path;
}
