import "server-only";

import { createHmac } from "node:crypto";
import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { assistantAnswerCache, assistantRateLimits } from "@/db/schema";
import { clientIp } from "@/lib/analytics/collect";
import { env } from "@/lib/env";
import { ASSISTANT_LIMITS } from "./config";

/**
 * Metering for the public assistant: who may ask, whether the site can afford
 * to answer, and what answering cost.
 *
 * Everything is a fixed-window counter in one table. Each check is a single
 * upsert that bumps some counters and reads others back, so enforcement costs
 * one round-trip. Attempts are counted before they're judged — a rejected
 * request still counts, which is what stops a script hammering the endpoint
 * from ever getting back under the line.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Site-wide buckets. Visitor buckets are `v:<hmac>:<window>`. */
const SITE = {
  minute: "all:minute",
  day: "all:day",
  tokens: "tokens:day",
  cacheHits: "cache:day",
  blocked: "blocked:day",
} as const;

type Bump = { bucket: string; windowStart: Date; by: number };

/** Adds `by` to each counter (0 just reads it) and returns the new totals. */
async function bump(rows: Bump[]): Promise<Map<string, number>> {
  const result = await db
    .insert(assistantRateLimits)
    .values(rows.map(({ bucket, windowStart, by }) => ({ bucket, windowStart, hits: by })))
    .onConflictDoUpdate({
      target: [assistantRateLimits.bucket, assistantRateLimits.windowStart],
      set: { hits: sql`${assistantRateLimits.hits} + excluded.hits` },
    })
    .returning({ bucket: assistantRateLimits.bucket, hits: assistantRateLimits.hits });

  return new Map(result.map((row) => [row.bucket, row.hits]));
}

// ── Visitor identity ─────────────────────────────────────────────────────────

/**
 * A stable, non-reversible key for the requester.
 *
 * The IP comes from `TRUSTED_IP_HEADER` when set — the header your host
 * guarantees (e.g. `cf-connecting-ip` behind Cloudflare). Otherwise the first
 * `x-forwarded-for` entry, which is correct on Vercel because Vercel sets that
 * header itself. Behind any other proxy, set `TRUSTED_IP_HEADER`, or a client
 * can supply its own "IP" and dodge the per-visitor limits (the site-wide caps
 * still hold).
 */
export function requestIp(headers: Headers): string | null {
  const trusted = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  return trusted ? headers.get(trusted)?.split(",")[0]?.trim() || null : clientIp(headers);
}

/** HMAC of the IP — the address itself is never stored. */
export function visitorKey(ip: string | null): string {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`assistant-visitor:${ip ?? "unknown"}`)
    .digest("hex")
    .slice(0, 32);
}

// ── Admission ────────────────────────────────────────────────────────────────

export type SiteLoad = { minute: number; day: number; tokens: number };

export type Admission =
  | { ok: true; site: SiteLoad }
  | { ok: false; retryAfterSeconds: number };

/**
 * Counts this request against the visitor's minute, hour and day windows, and
 * reads the site-wide load in the same statement.
 */
export async function admitVisitor(visitor: string, now = new Date()): Promise<Admission> {
  const minute = windowStart(now, MINUTE_MS);
  const hour = windowStart(now, HOUR_MS);
  const day = windowStart(now, DAY_MS);

  const own = {
    minute: `v:${visitor}:minute`,
    hour: `v:${visitor}:hour`,
    day: `v:${visitor}:day`,
  };

  const totals = await bump([
    { bucket: own.minute, windowStart: minute, by: 1 },
    { bucket: own.hour, windowStart: hour, by: 1 },
    { bucket: own.day, windowStart: day, by: 1 },
    { bucket: SITE.minute, windowStart: minute, by: 0 },
    { bucket: SITE.day, windowStart: day, by: 0 },
    { bucket: SITE.tokens, windowStart: day, by: 0 },
  ]);

  const count = (bucket: string) => totals.get(bucket) ?? 0;

  // Longest window first: telling someone to retry in a minute when they're
  // out for the day would just invite another rejected attempt.
  if (count(own.day) > ASSISTANT_LIMITS.perVisitorPerDay) {
    return { ok: false, retryAfterSeconds: secondsUntil(day, DAY_MS, now) };
  }
  if (count(own.hour) > ASSISTANT_LIMITS.perVisitorPerHour) {
    return { ok: false, retryAfterSeconds: secondsUntil(hour, HOUR_MS, now) };
  }
  if (count(own.minute) > ASSISTANT_LIMITS.perVisitorPerMinute) {
    return { ok: false, retryAfterSeconds: secondsUntil(minute, MINUTE_MS, now) };
  }

  return {
    ok: true,
    site: { minute: count(SITE.minute), day: count(SITE.day), tokens: count(SITE.tokens) },
  };
}

export type Capacity =
  | { ok: true }
  | { ok: false; scope: "minute" | "day"; retryAfterSeconds: number };

/** Whether the site can afford one more provider call, given the load just read. */
export function siteCapacity(site: SiteLoad, now = new Date()): Capacity {
  if (site.day >= ASSISTANT_LIMITS.perDay || site.tokens >= ASSISTANT_LIMITS.tokensPerDay) {
    return { ok: false, scope: "day", retryAfterSeconds: secondsUntil(windowStart(now, DAY_MS), DAY_MS, now) };
  }
  if (site.minute >= ASSISTANT_LIMITS.perMinute) {
    return { ok: false, scope: "minute", retryAfterSeconds: secondsUntil(windowStart(now, MINUTE_MS), MINUTE_MS, now) };
  }
  return { ok: true };
}

// ── Recording ────────────────────────────────────────────────────────────────

/** Claims one provider call against the site's minute and day allowance. */
export async function reserveAnswer(now = new Date()): Promise<void> {
  await bump([
    { bucket: SITE.minute, windowStart: windowStart(now, MINUTE_MS), by: 1 },
    { bucket: SITE.day, windowStart: windowStart(now, DAY_MS), by: 1 },
  ]);
}

/** Adds what an answer actually cost to today's token budget. */
export async function recordTokens(tokens: number, now = new Date()): Promise<void> {
  if (tokens <= 0) return;
  await bump([{ bucket: SITE.tokens, windowStart: windowStart(now, DAY_MS), by: Math.ceil(tokens) }]);
}

export async function recordEvent(kind: "cacheHit" | "blocked", now = new Date()): Promise<void> {
  const bucket = kind === "cacheHit" ? SITE.cacheHits : SITE.blocked;
  await bump([{ bucket, windowStart: windowStart(now, DAY_MS), by: 1 }]);
}

// ── Reporting ────────────────────────────────────────────────────────────────

export type UsageToday = {
  answers: number;
  tokens: number;
  cacheHits: number;
  blocked: number;
};

/** Today's (UTC) figures for the admin panel. */
export async function assistantUsageToday(now = new Date()): Promise<UsageToday> {
  const rows = await db
    .select({ bucket: assistantRateLimits.bucket, hits: assistantRateLimits.hits })
    .from(assistantRateLimits)
    .where(
      and(
        inArray(assistantRateLimits.bucket, [SITE.day, SITE.tokens, SITE.cacheHits, SITE.blocked]),
        eq(assistantRateLimits.windowStart, windowStart(now, DAY_MS)),
      ),
    );

  const count = (bucket: string) => rows.find((row) => row.bucket === bucket)?.hits ?? 0;

  return {
    answers: count(SITE.day),
    tokens: count(SITE.tokens),
    cacheHits: count(SITE.cacheHits),
    blocked: count(SITE.blocked),
  };
}

/** Drops counter windows that can't affect a decision, and expired cached answers. */
export async function purgeExpired(now = new Date()): Promise<void> {
  await Promise.all([
    db
      .delete(assistantRateLimits)
      .where(lt(assistantRateLimits.windowStart, new Date(now.getTime() - 2 * DAY_MS))),
    db
      .delete(assistantAnswerCache)
      .where(lt(assistantAnswerCache.createdAt, new Date(now.getTime() - ASSISTANT_LIMITS.cacheTtlMs))),
  ]);
}

// ── Windows ──────────────────────────────────────────────────────────────────

/** UTC-aligned, so "per day" means the same thing on every server. */
function windowStart(now: Date, size: number): Date {
  return new Date(Math.floor(now.getTime() / size) * size);
}

function secondsUntil(start: Date, size: number, now: Date): number {
  return Math.max(1, Math.ceil((start.getTime() + size - now.getTime()) / 1000));
}
