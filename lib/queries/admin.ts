import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  contactLinks,
  coreStackItems,
  experiences,
  media,
  messages,
  navItems,
  profile,
  projectCategories,
  projects,
  sections,
  siteSettings,
  skillGroups,
  skillLevels,
  socialLinks,
} from "@/db/schema";

/**
 * Read layer for the admin panel.
 *
 * Uncached and unfiltered, unlike `./public.ts`: an editor must see hidden rows
 * and their own change the instant it lands, so caching here would be actively
 * wrong. Admin routes are behind auth and see little traffic, which is what
 * makes going straight to the database the right call.
 */

export async function getSiteSettingsForAdmin() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);
  return row ?? null;
}

export async function getProfileForAdmin() {
  const [row] = await db
    .select()
    .from(profile)
    .where(eq(profile.id, 1))
    .limit(1);
  return row ?? null;
}

export async function getSections() {
  return db.select().from(sections).orderBy(asc(sections.sortOrder));
}

export async function getCoreStackItems() {
  return db
    .select()
    .from(coreStackItems)
    .orderBy(asc(coreStackItems.sortOrder));
}

export async function getSkillLevels() {
  return db.select().from(skillLevels).orderBy(asc(skillLevels.sortOrder));
}

export async function getSkillGroupsWithSkills() {
  return db.query.skillGroups.findMany({
    orderBy: (group, { asc: ascending }) => [ascending(group.sortOrder)],
    with: {
      skills: {
        orderBy: (skill, { asc: ascending }) => [ascending(skill.sortOrder)],
        with: { level: true },
      },
    },
  });
}

export async function getExperiences() {
  return db.select().from(experiences).orderBy(asc(experiences.sortOrder));
}

export async function getProjectCategories() {
  return db
    .select()
    .from(projectCategories)
    .orderBy(asc(projectCategories.sortOrder));
}

export async function getProjectsForAdmin() {
  return db.query.projects.findMany({
    orderBy: (project, { asc: ascending }) => [ascending(project.sortOrder)],
    with: { category: true },
  });
}

/**
 * Postgres raises a syntax error for a malformed uuid rather than returning no
 * rows, so a bad URL segment has to be rejected before it reaches the query.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getProjectById(id: string) {
  if (!UUID_PATTERN.test(id)) return null;

  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return row ?? null;
}

export async function getHighlightGroupsWithItems() {
  return db.query.highlightGroups.findMany({
    orderBy: (group, { asc: ascending }) => [ascending(group.sortOrder)],
    with: {
      highlights: {
        orderBy: (highlight, { asc: ascending }) => [
          ascending(highlight.sortOrder),
        ],
      },
    },
  });
}

export async function getContactLinks() {
  return db.select().from(contactLinks).orderBy(asc(contactLinks.sortOrder));
}

export async function getSocialLinks() {
  return db.select().from(socialLinks).orderBy(asc(socialLinks.sortOrder));
}

export async function getNavItems() {
  return db.select().from(navItems).orderBy(asc(navItems.sortOrder));
}

export async function getMediaLibrary() {
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(120);
}

// ── Messages ─────────────────────────────────────────────────────────────────

export type MessageFilter = "inbox" | "archived";

export async function getMessages(filter: MessageFilter = "inbox") {
  return db
    .select()
    .from(messages)
    .where(eq(messages.isArchived, filter === "archived"))
    .orderBy(desc(messages.createdAt))
    .limit(200);
}

export async function getUnreadMessageCount(): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(messages)
    .where(and(eq(messages.isRead, false), eq(messages.isArchived, false)));

  return row?.total ?? 0;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Which parts of the public site are currently showing bundled starter content
 * rather than the owner's own.
 *
 * The public page silently falls back so it never looks broken — which means
 * the only place that gap can be surfaced is here. Without this an owner could
 * publish a site that still reads "Rajan Shrestha" and never notice.
 */
export async function getFallbackAreas(): Promise<string[]> {
  const [profileRows, projectRows, experienceRows, skillRows] =
    await Promise.all([
      db.select({ id: profile.id }).from(profile).limit(1),
      db.select({ id: projects.id }).from(projects).limit(1),
      db.select({ id: experiences.id }).from(experiences).limit(1),
      db.select({ id: skillGroups.id }).from(skillGroups).limit(1),
    ]);

  const areas: string[] = [];
  if (profileRows.length === 0) areas.push("Profile & hero");
  if (skillRows.length === 0) areas.push("Skills");
  if (experienceRows.length === 0) areas.push("Experience");
  if (projectRows.length === 0) areas.push("Projects");

  return areas;
}

/** Counts for the overview cards, gathered in one round of parallel queries. */
export async function getDashboardStats() {
  const [
    projectRows,
    liveProjectRows,
    experienceRows,
    skillRows,
    mediaRows,
    unreadMessages,
  ] = await Promise.all([
    db.select({ total: count() }).from(projects),
    db.select({ total: count() }).from(projects).where(eq(projects.visible, true)),
    db.select({ total: count() }).from(experiences),
    db.select({ total: count() }).from(skillGroups),
    db.select({ total: count() }).from(media),
    getUnreadMessageCount(),
  ]);

  return {
    projects: projectRows[0]?.total ?? 0,
    liveProjects: liveProjectRows[0]?.total ?? 0,
    experiences: experienceRows[0]?.total ?? 0,
    skillGroups: skillRows[0]?.total ?? 0,
    mediaAssets: mediaRows[0]?.total ?? 0,
    unreadMessages,
  };
}
