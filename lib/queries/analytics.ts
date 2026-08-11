import "server-only";

import { and, countDistinct, desc, gte, isNotNull, sql } from "drizzle-orm";
import { count } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { pageViews } from "@/db/schema";

/**
 * Read layer for the analytics dashboard.
 *
 * Every figure is aggregated in Postgres rather than by pulling rows into the
 * app. On a table that only grows, `SELECT *` then `.length` is the kind of
 * query that works fine for a month and then doesn't.
 */

function since(days: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function startOfToday(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export type AnalyticsSummary = {
  viewsToday: number;
  visitorsToday: number;
  views7d: number;
  visitors7d: number;
  views30d: number;
  visitors30d: number;
  viewsAllTime: number;
  /** Percentage change in views, this 7-day window vs the previous one. */
  trend7d: number | null;
};

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const today = startOfToday();
  const week = since(7);
  const previousWeek = since(14);
  const month = since(30);

  const [
    todayRows,
    weekRows,
    monthRows,
    allTimeRows,
    previousWeekRows,
  ] = await Promise.all([
    db
      .select({
        views: count(),
        visitors: countDistinct(pageViews.visitorHash),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, today)),

    db
      .select({
        views: count(),
        visitors: countDistinct(pageViews.visitorHash),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, week)),

    db
      .select({
        views: count(),
        visitors: countDistinct(pageViews.visitorHash),
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, month)),

    db.select({ views: count() }).from(pageViews),

    // The 7 days immediately before the current window, for the comparison.
    db
      .select({ views: count() })
      .from(pageViews)
      .where(
        and(
          gte(pageViews.createdAt, previousWeek),
          sql`${pageViews.createdAt} < ${week}`,
        ),
      ),
  ]);

  const views7d = weekRows[0]?.views ?? 0;
  const previousViews = previousWeekRows[0]?.views ?? 0;

  return {
    viewsToday: todayRows[0]?.views ?? 0,
    visitorsToday: todayRows[0]?.visitors ?? 0,
    views7d,
    visitors7d: weekRows[0]?.visitors ?? 0,
    views30d: monthRows[0]?.views ?? 0,
    visitors30d: monthRows[0]?.visitors ?? 0,
    viewsAllTime: allTimeRows[0]?.views ?? 0,
    // No baseline means no meaningful percentage — better to show nothing than
    // a fabricated "+100%" on a site's first week.
    trend7d:
      previousViews === 0
        ? null
        : Math.round(((views7d - previousViews) / previousViews) * 100),
  };
}

export type DailyPoint = { date: string; views: number; visitors: number };

/**
 * Views per day, with empty days filled in.
 *
 * `generate_series` produces the calendar and the views LEFT JOIN onto it, so
 * quiet days appear as zero instead of vanishing — a chart that silently omits
 * them misrepresents the shape of the trend.
 */
export async function getDailyViews(days = 14): Promise<DailyPoint[]> {
  const rows = await db.execute<{
    date: string;
    views: number;
    visitors: number;
  }>(sql`
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS date,
      COALESCE(COUNT(v.id), 0)::int AS views,
      COALESCE(COUNT(DISTINCT v.visitor_hash), 0)::int AS visitors
    FROM generate_series(
      (now() AT TIME ZONE 'utc')::date - ${days - 1}::int,
      (now() AT TIME ZONE 'utc')::date,
      '1 day'
    ) AS d(day)
    LEFT JOIN page_views v
      ON (v.created_at AT TIME ZONE 'utc')::date = d.day
    GROUP BY d.day
    ORDER BY d.day ASC
  `);

  // The Neon HTTP driver returns `{ rows }`; some drizzle versions hand back a
  // bare array. Normalise rather than assume.
  return Array.isArray(rows)
    ? (rows as DailyPoint[])
    : ((rows as { rows?: DailyPoint[] }).rows ?? []);
}

export type Breakdown = { label: string; views: number };

/** Shared shape for the nullable text dimensions (referrer host, country). */
async function topBy(
  column: PgColumn,
  days: number,
  limit: number,
): Promise<Breakdown[]> {
  const rows = await db
    .select({ label: column, views: count() })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, since(days)), isNotNull(column)))
    .groupBy(column)
    .orderBy(desc(count()))
    .limit(limit);

  /*
   * A generic `PgColumn` erases the column's data type, so `label` widens to
   * `unknown`. The `isNotNull` filter above already guarantees a value; this
   * narrows it back to a string for the caller without loosening the export.
   */
  return (rows as { label: unknown; views: number }[]).flatMap((row) =>
    typeof row.label === "string" && row.label.length > 0
      ? [{ label: row.label, views: row.views }]
      : [],
  );
}

export function getTopReferrers(days = 30, limit = 6) {
  return topBy(pageViews.referrerHost, days, limit);
}

export function getTopCountries(days = 30, limit = 6) {
  return topBy(pageViews.country, days, limit);
}

export async function getTopPages(days = 30, limit = 6): Promise<Breakdown[]> {
  const rows = await db
    .select({ label: pageViews.path, views: count() })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since(days)))
    .groupBy(pageViews.path)
    .orderBy(desc(count()))
    .limit(limit);

  return rows;
}

export async function getDeviceBreakdown(days = 30): Promise<Breakdown[]> {
  const rows = await db
    .select({ label: pageViews.device, views: count() })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since(days)))
    .groupBy(pageViews.device)
    .orderBy(desc(count()));

  return rows;
}

/** Direct traffic is the complement of everything with a referrer. */
export async function getDirectShare(days = 30): Promise<number> {
  const [row] = await db
    .select({
      total: count(),
      direct: sql<number>`count(*) filter (where ${pageViews.referrerHost} is null)::int`,
    })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since(days)));

  const total = row?.total ?? 0;
  if (total === 0) return 0;
  return Math.round(((row?.direct ?? 0) / total) * 100);
}
