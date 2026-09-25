import "server-only";

import { eq, max } from "drizzle-orm";

import { db } from "@/db";
import { experiences, profile, projects, sections, services, skillGroups } from "@/db/schema";

/**
 * When content last changed, for the sitemap's `lastmod`.
 *
 * Search engines use `lastmod` to decide what to recrawl, but only while it's
 * trustworthy — a sitemap that stamps every URL with "now" on every request
 * teaches them to ignore it. These dates come from the rows themselves.
 */
export async function contentFreshness(): Promise<{
  home: Date | undefined;
  projects: Map<string, Date>;
}> {
  try {
    const [projectRows, ...latest] = await Promise.all([
      db
        .select({ slug: projects.slug, updatedAt: projects.updatedAt })
        .from(projects)
        .where(eq(projects.visible, true)),
      ...[profile, sections, projects, experiences, services, skillGroups].map((table) =>
        db.select({ at: max(table.updatedAt) }).from(table),
      ),
    ]);

    const stamps = latest
      .map(([row]) => row?.at)
      .filter((value): value is Date => value instanceof Date);

    return {
      home: stamps.length > 0 ? new Date(Math.max(...stamps.map((date) => date.getTime()))) : undefined,
      projects: new Map(projectRows.map((row) => [row.slug, row.updatedAt])),
    };
  } catch (error) {
    // Dates are an optimisation; the sitemap is still valid without them.
    console.error("[seo] content dates unavailable", error);
    return { home: undefined, projects: new Map() };
  }
}
