import "server-only";

import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  contactLinks,
  coreStackItems,
  experiences,
  navItems,
  profile as profileTable,
  projectCategories,
  projects,
  sections,
  sectionKey,
  services,
  siteSettings,
  skillGroups,
  socialLinks,
  type SectionKey,
} from "@/db/schema";
import {
  DEFAULT_CONTACT_LINKS,
  DEFAULT_CORE_STACK,
  DEFAULT_EXPERIENCES,
  DEFAULT_SERVICES,
  DEFAULT_HIGHLIGHT_GROUPS,
  DEFAULT_NAV_ITEMS,
  DEFAULT_PROFILE,
  DEFAULT_PROJECTS,
  DEFAULT_PROJECT_CATEGORIES,
  DEFAULT_SECTIONS,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SKILL_GROUPS,
  DEFAULT_SOCIAL_LINKS,
} from "@/lib/content/defaults";
import { CACHE_TAGS } from "./keys";

/**
 * Read layer for the public site.
 *
 * Two rules shape everything here:
 *
 * 1. **Select explicitly.** Only columns the UI renders are fetched, so audit
 *    timestamps and internal flags never cross into the client bundle. It also
 *    keeps the cached payload free of `Date` instances, which the data cache
 *    would flatten to strings on the way back out.
 *
 * 2. **Cache by tag.** Every read is wrapped in `unstable_cache`, so a warm
 *    render costs zero database round-trips. Admin mutations drop the entries
 *    via `revalidateContent()`.
 *
 * 3. **Never render an empty page.** Anything the database doesn't supply falls
 *    back to the bundled content in `lib/content/defaults.ts`. See
 *    `withDefaults()` below for the precedence rules.
 */

// ── Site settings ────────────────────────────────────────────────────────────

/**
 * Kept separate from the page payload: `generateMetadata` runs independently of
 * the page body and needs only these columns.
 */
const fetchSiteSettings = unstable_cache(
  async () => {
    const [row] = await db
      .select({
        brandPrefix: siteSettings.brandPrefix,
        brandName: siteSettings.brandName,
        footerBrand: siteSettings.footerBrand,
        footerTagline: siteSettings.footerTagline,
        metaTitle: siteSettings.metaTitle,
        metaDescription: siteSettings.metaDescription,
        metaKeywords: siteSettings.metaKeywords,
        ogImageUrl: siteSettings.ogImageUrl,
        gaMeasurementId: siteSettings.gaMeasurementId,
        assistantEnabled: siteSettings.assistantEnabled,
        assistantWelcome: siteSettings.assistantWelcome,
        assistantQuestions: siteSettings.assistantQuestions,
        assistantPronouns: siteSettings.assistantPronouns,
      })
      .from(siteSettings)
      .where(eq(siteSettings.id, 1))
      .limit(1);
    return row ?? null;
  },
  ["site-settings"],
  { tags: [CACHE_TAGS.settings] },
);

export type SiteSettingsView = NonNullable<
  Awaited<ReturnType<typeof fetchSiteSettings>>
>;

/**
 * Branding and SEO, guaranteed non-null.
 *
 * The error branch is deliberately outside `unstable_cache`: caching a fallback
 * produced by a transient outage would keep serving it long after the database
 * recovered.
 */
export async function getSiteSettings(): Promise<SiteSettingsView> {
  try {
    return (await fetchSiteSettings()) ?? DEFAULT_SITE_SETTINGS;
  } catch (error) {
    console.error(
      "[content] site settings unavailable — using bundled defaults",
      error,
    );
    return DEFAULT_SITE_SETTINGS;
  }
}

// ── Section headers ──────────────────────────────────────────────────────────

export type SectionView = {
  key: SectionKey;
  eyebrow: string;
  heading: string;
  headingAccent: string | null;
  subheading: string | null;
  note: string | null;
  visible: boolean;
};

/** Every key is always present, so consumers never guard for `undefined`. */
export type SectionMap = Record<SectionKey, SectionView>;

/**
 * Fills in any section the database is missing, using the bundled copy for that
 * key rather than a blank header — an unseeded install should read as a
 * finished page, not a page with its titles stripped out.
 *
 * A plain object rather than a Proxy with a fallback trap, because this value
 * round-trips through the data cache and only its own enumerable properties
 * survive that.
 */
function toSectionMap(rows: SectionView[]): SectionMap {
  const map = Object.fromEntries(
    sectionKey.enumValues.map((key) => [
      key,
      DEFAULT_SECTIONS.find((section) => section.key === key) ?? {
        key,
        eyebrow: "",
        heading: "",
        headingAccent: null,
        subheading: null,
        note: null,
        visible: true,
      },
    ]),
  ) as SectionMap;

  for (const row of rows) map[row.key] = row;
  return map;
}

// ── Page payload ─────────────────────────────────────────────────────────────

const fetchPortfolio = unstable_cache(
  async () => {
    // Independent queries, issued together: the page waits on the slowest one
    // rather than the sum of all of them.
    const [
      profileRows,
      sectionRows,
      coreStack,
      skillGroupRows,
      serviceRows,
      experienceRows,
      categories,
      projectRows,
      highlightGroupRows,
      contactLinkRows,
      socialLinkRows,
      navItemRows,
    ] = await Promise.all([
      db
        .select({
          greeting: profileTable.greeting,
          fullName: profileTable.fullName,
          typewriterWords: profileTable.typewriterWords,
          availabilityLabel: profileTable.availabilityLabel,
          availabilityVisible: profileTable.availabilityVisible,
          heroBio: profileTable.heroBio,
          openTo: profileTable.openTo,
          heroBadges: profileTable.heroBadges,
          avatarUrl: profileTable.avatarUrl,
          location: profileTable.location,
          experienceYears: profileTable.experienceYears,
          experienceLabel: profileTable.experienceLabel,
          cvUrl: profileTable.cvUrl,
          aboutParagraphs: profileTable.aboutParagraphs,
          coreStackTitle: profileTable.coreStackTitle,
        })
        .from(profileTable)
        .where(eq(profileTable.id, 1))
        .limit(1),

      db
        .select({
          key: sections.key,
          eyebrow: sections.eyebrow,
          heading: sections.heading,
          headingAccent: sections.headingAccent,
          subheading: sections.subheading,
          note: sections.note,
          visible: sections.visible,
        })
        .from(sections)
        .orderBy(asc(sections.sortOrder)),

      db
        .select({
          id: coreStackItems.id,
          icon: coreStackItems.icon,
          label: coreStackItems.label,
        })
        .from(coreStackItems)
        .where(eq(coreStackItems.visible, true))
        .orderBy(asc(coreStackItems.sortOrder)),

      db.query.skillGroups.findMany({
        columns: { id: true, icon: true, label: true, title: true },
        where: eq(skillGroups.visible, true),
        orderBy: (group, { asc: ascending }) => [ascending(group.sortOrder)],
        with: {
          skills: {
            columns: { id: true, name: true },
            orderBy: (skill, { asc: ascending }) => [ascending(skill.sortOrder)],
          },
        },
      }),

      db
        .select({
          id: services.id,
          icon: services.icon,
          title: services.title,
          summary: services.summary,
          deliverables: services.deliverables,
          note: services.note,
          featured: services.featured,
        })
        .from(services)
        .where(eq(services.visible, true))
        .orderBy(asc(services.sortOrder)),

      db
        .select({
          id: experiences.id,
          title: experiences.title,
          company: experiences.company,
          period: experiences.period,
          employmentType: experiences.employmentType,
          summary: experiences.summary,
          bullets: experiences.bullets,
        })
        .from(experiences)
        .where(eq(experiences.visible, true))
        .orderBy(asc(experiences.sortOrder)),

      db
        .select({
          id: projectCategories.id,
          slug: projectCategories.slug,
          label: projectCategories.label,
        })
        .from(projectCategories)
        .orderBy(asc(projectCategories.sortOrder)),

      db.query.projects.findMany({
        columns: {
          id: true,
          title: true,
          slug: true,
          description: true,
          imageUrl: true,
          tech: true,
          demoUrl: true,
          codeUrl: true,
          featured: true,
        },
        where: eq(projects.visible, true),
        orderBy: (project, { asc: ascending }) => [ascending(project.sortOrder)],
        with: { category: { columns: { slug: true, label: true } } },
      }),

      db.query.highlightGroups.findMany({
        columns: { id: true, slug: true, icon: true, label: true, title: true },
        orderBy: (group, { asc: ascending }) => [ascending(group.sortOrder)],
        with: {
          highlights: {
            columns: { id: true, icon: true, text: true },
            orderBy: (highlight, { asc: ascending }) => [
              ascending(highlight.sortOrder),
            ],
          },
        },
      }),

      db
        .select({
          id: contactLinks.id,
          icon: contactLinks.icon,
          label: contactLinks.label,
          value: contactLinks.value,
          href: contactLinks.href,
        })
        .from(contactLinks)
        .where(eq(contactLinks.visible, true))
        .orderBy(asc(contactLinks.sortOrder)),

      db
        .select({
          id: socialLinks.id,
          icon: socialLinks.icon,
          label: socialLinks.label,
          href: socialLinks.href,
          showInHeader: socialLinks.showInHeader,
          showInFooter: socialLinks.showInFooter,
        })
        .from(socialLinks)
        .orderBy(asc(socialLinks.sortOrder)),

      db
        .select({
          id: navItems.id,
          label: navItems.label,
          href: navItems.href,
          showInHeader: navItems.showInHeader,
          showInFooter: navItems.showInFooter,
        })
        .from(navItems)
        .orderBy(asc(navItems.sortOrder)),
    ]);

    return {
      // `.at()` rather than `[0]`: index access is typed as always-present
      // without `noUncheckedIndexedAccess`, which would silently drop the
      // `null` from this union and defeat the fallback downstream.
      profile: profileRows.at(0) ?? null,
      sections: toSectionMap(sectionRows),
      coreStack,
      skillGroups: skillGroupRows,
      services: serviceRows,
      experiences: experienceRows,
      projectCategories: categories,
      projects: projectRows,
      highlightGroups: highlightGroupRows,
      contactLinks: contactLinkRows,
      socialLinks: socialLinkRows,
      navItems: navItemRows,
    };
  },
  ["portfolio-content"],
  { tags: [CACHE_TAGS.content] },
);

/** Shape returned by the raw query, before defaults are applied. */
type RawPortfolio = Awaited<ReturnType<typeof fetchPortfolio>>;

/** What the page actually receives: same shape, with `profile` guaranteed. */
export type PortfolioData = Omit<RawPortfolio, "profile"> & {
  profile: ProfileView;
};

/**
 * Applies the bundled content wherever the database has nothing to show.
 *
 * Two rules, chosen so an editor's intent always wins over the fallback:
 *
 * - **Singletons** (profile) fall back only when the row is *absent*. Once the
 *   row exists it is used verbatim, blanks included — otherwise clearing a
 *   field in the CMS would make the old copy reappear, which reads as a bug.
 *
 * - **Collections** fall back only when they are *entirely empty*. A partially
 *   filled list is never topped up with starter entries.
 *
 * The deliberate gap: emptying a collection completely brings the defaults
 * back. That is the right default for a portfolio — a blank Projects section
 * helps nobody — and the intended way to remove a section for good is the
 * visibility toggle on Section headers, which `withDefaults` never overrides.
 */
function withDefaults(raw: RawPortfolio): PortfolioData {
  const orEmpty = <T>(rows: T[], fallback: T[]) =>
    rows.length > 0 ? rows : fallback;

  return {
    ...raw,
    profile: raw.profile ?? DEFAULT_PROFILE,
    coreStack: orEmpty(raw.coreStack, DEFAULT_CORE_STACK),
    skillGroups: orEmpty(raw.skillGroups, DEFAULT_SKILL_GROUPS),
    services: orEmpty(raw.services, DEFAULT_SERVICES),
    experiences: orEmpty(raw.experiences, DEFAULT_EXPERIENCES),
    // Categories are only filter tabs, so they follow the projects list: real
    // projects with no categories should show a single "All" tab, not starter
    // tabs that match nothing.
    projectCategories:
      raw.projects.length > 0
        ? raw.projectCategories
        : orEmpty(raw.projectCategories, DEFAULT_PROJECT_CATEGORIES),
    projects: orEmpty(raw.projects, DEFAULT_PROJECTS),
    highlightGroups: orEmpty(raw.highlightGroups, DEFAULT_HIGHLIGHT_GROUPS),
    contactLinks: orEmpty(raw.contactLinks, DEFAULT_CONTACT_LINKS),
    socialLinks: orEmpty(raw.socialLinks, DEFAULT_SOCIAL_LINKS),
    navItems: orEmpty(raw.navItems, DEFAULT_NAV_ITEMS),
  };
}

/** The complete page payload. Never throws, never returns an empty page. */
export async function getPortfolio(): Promise<PortfolioData> {
  try {
    return withDefaults(await fetchPortfolio());
  } catch (error) {
    // A portfolio should not 500 because the database blinked. Logged loudly so
    // the outage is still visible in the platform's logs.
    console.error(
      "[content] portfolio unavailable — using bundled defaults",
      error,
    );
    return withDefaults({
      profile: null,
      sections: toSectionMap([]),
      coreStack: [],
      skillGroups: [],
      services: [],
      experiences: [],
      projectCategories: [],
      projects: [],
      highlightGroups: [],
      contactLinks: [],
      socialLinks: [],
      navItems: [],
    });
  }
}

export type ProfileView = NonNullable<RawPortfolio["profile"]>;
export type CoreStackView = RawPortfolio["coreStack"][number];
export type SkillGroupView = RawPortfolio["skillGroups"][number];
export type ServiceView = RawPortfolio["services"][number];
export type ExperienceView = RawPortfolio["experiences"][number];
export type ProjectCategoryView = RawPortfolio["projectCategories"][number];
export type ProjectView = RawPortfolio["projects"][number];
export type HighlightGroupView = RawPortfolio["highlightGroups"][number];
export type ContactLinkView = RawPortfolio["contactLinks"][number];
export type SocialLinkView = RawPortfolio["socialLinks"][number];
export type NavItemView = RawPortfolio["navItems"][number];
