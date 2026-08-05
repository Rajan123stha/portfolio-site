import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import type { ColorToken, IconName } from "@/lib/design-tokens";

/**
 * Content model for the portfolio CMS.
 *
 * Two shapes are used deliberately:
 *
 *  - **Singletons** (`site_settings`, `profile`) hold one-of-a-kind content.
 *    They pin `id` to 1 with a CHECK constraint so a second row is impossible
 *    at the database level, not just by convention.
 *
 *  - **Ordered collections** (skills, experiences, projects, …) carry a
 *    `sort_order` that the admin panel rewrites on drag-and-drop, plus a
 *    `visible` flag so content can be hidden without being destroyed.
 *
 * Icons and colours are stored as *token keys*, never as raw Tailwind class
 * strings — see `lib/design-tokens.ts`. Tailwind's JIT compiler only emits
 * classes it can find as literals in source, so a class name assembled from a
 * database value would silently produce unstyled markup in production.
 */

/** Reusable audit columns. `updatedAt` is maintained by the application layer. */
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};

/** Constrains a singleton table to exactly one row, forever. */
const singletonId = () => integer("id").primaryKey().default(1);

// ── Auth ─────────────────────────────────────────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  /**
   * Incremented to invalidate every issued JWT for this user at once
   * ("sign out everywhere", or after a password change). Sessions are
   * otherwise stateless, so this is the only revocation mechanism.
   */
  tokenVersion: integer("token_version").notNull().default(0),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
}, (table) => [
  uniqueIndex("admin_users_email_key").on(sql`lower(${table.email})`),
]);

// ── Site-wide settings ───────────────────────────────────────────────────────

export const siteSettings = pgTable("site_settings", {
  id: singletonId(),

  // Header/footer branding — the logo renders as `{ dev | Rajan }`.
  brandPrefix: text("brand_prefix").notNull().default("dev"),
  brandName: text("brand_name").notNull().default("Rajan"),
  footerBrand: text("footer_brand").notNull().default("DevRajan"),
  footerTagline: text("footer_tagline").notNull().default(""),

  // SEO
  metaTitle: text("meta_title").notNull(),
  metaDescription: text("meta_description").notNull(),
  metaKeywords: jsonb("meta_keywords").$type<string[]>().notNull().default([]),
  ogImageUrl: text("og_image_url"),

  // Integrations
  gaMeasurementId: text("ga_measurement_id"),

  ...timestamps,
}, (table) => [
  check("site_settings_singleton", sql`${table.id} = 1`),
]);

// ── Profile (hero + about personal data) ─────────────────────────────────────

/** One entry of the hero typewriter rotation. */
export type TypewriterWord = { text: string };

/** A pill that floats around the hero avatar. */
export type HeroBadge = {
  label: string;
  color: ColorToken;
  /** Anchor point around the avatar; mapped to a literal class in code. */
  position: "top-right" | "left" | "bottom-left" | "bottom-right";
};

export const profile = pgTable("profile", {
  id: singletonId(),

  // Hero
  greeting: text("greeting").notNull().default("Hi 👋, I'm"),
  fullName: text("full_name").notNull(),
  typewriterWords: jsonb("typewriter_words")
    .$type<TypewriterWord[]>()
    .notNull()
    .default([]),
  availabilityLabel: text("availability_label")
    .notNull()
    .default("Available for work"),
  availabilityVisible: boolean("availability_visible").notNull().default(true),
  heroBio: text("hero_bio").notNull(),
  openTo: jsonb("open_to").$type<string[]>().notNull().default([]),
  heroBadges: jsonb("hero_badges").$type<HeroBadge[]>().notNull().default([]),

  // Shared identity
  avatarUrl: text("avatar_url"),
  avatarPublicId: text("avatar_public_id"),
  location: text("location").notNull().default(""),
  experienceLabel: text("experience_label").notNull().default(""),
  experienceYears: text("experience_years").notNull().default(""),
  cvUrl: text("cv_url"),

  // About
  aboutParagraphs: jsonb("about_paragraphs")
    .$type<string[]>()
    .notNull()
    .default([]),
  coreStackTitle: text("core_stack_title").notNull().default("Core Stack"),

  ...timestamps,
}, (table) => [
  check("profile_singleton", sql`${table.id} = 1`),
]);

// ── Section headers ──────────────────────────────────────────────────────────

/**
 * Every section on the page shares the same header shape (eyebrow rule +
 * heading + optional lede), so one uniform table covers all of them and gives
 * per-section show/hide and reordering for free.
 */
export const sectionKey = pgEnum("section_key", [
  "hero",
  "about",
  "skills",
  "experience",
  "projects",
  "value",
  "contact",
]);

export const sections = pgTable("sections", {
  key: sectionKey("key").primaryKey(),
  eyebrow: text("eyebrow").notNull().default(""),
  heading: text("heading").notNull().default(""),
  /** Rendered in the accent colour after `heading`; optional. */
  headingAccent: text("heading_accent"),
  subheading: text("subheading"),
  /** Free-form footnote — currently the "Actively leveling up" badge. */
  note: text("note"),
  visible: boolean("visible").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// ── About: core stack cards ──────────────────────────────────────────────────

export const coreStackItems = pgTable("core_stack_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  icon: text("icon").$type<IconName>().notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  ...timestamps,
}, (table) => [
  index("core_stack_items_order_idx").on(table.sortOrder),
]);

// ── Skills ───────────────────────────────────────────────────────────────────

/**
 * Proficiency tiers are data rather than an enum so the legend, ordering and
 * bar widths stay editable without a migration.
 */
export const skillLevels = pgTable("skill_levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  /** Bar fill, 0–100. */
  percent: integer("percent").notNull(),
  color: text("color").$type<ColorToken>().notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("skill_levels_label_key").on(table.label),
  check("skill_levels_percent_range", sql`${table.percent} between 0 and 100`),
]);

export const skillGroups = pgTable("skill_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  icon: text("icon").$type<IconName>().notNull(),
  /** Small uppercase kicker above the card title. */
  label: text("label").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  ...timestamps,
});

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => skillGroups.id, { onDelete: "cascade" }),
  levelId: uuid("level_id")
    .notNull()
    .references(() => skillLevels.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  index("skills_group_idx").on(table.groupId, table.sortOrder),
]);

// ── Experience ───────────────────────────────────────────────────────────────

export const experiences = pgTable("experiences", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  /** Free text ("June 2025 — Present") so open-ended roles read naturally. */
  period: text("period").notNull(),
  employmentType: text("employment_type").notNull().default(""),
  summary: text("summary").notNull().default(""),
  /** Ordered achievement bullets; they have no identity of their own. */
  bullets: jsonb("bullets").$type<string[]>().notNull().default([]),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  ...timestamps,
}, (table) => [
  index("experiences_order_idx").on(table.sortOrder),
]);

// ── Projects ─────────────────────────────────────────────────────────────────

export const projectCategories = pgTable("project_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("project_categories_slug_key").on(table.slug),
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => projectCategories.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  /** Tech badges. Ordered strings with no independent identity. */
  tech: jsonb("tech").$type<string[]>().notNull().default([]),
  demoUrl: text("demo_url"),
  codeUrl: text("code_url"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  ...timestamps,
}, (table) => [
  uniqueIndex("projects_slug_key").on(table.slug),
  index("projects_order_idx").on(table.sortOrder),
]);

// ── "Why work with me" ───────────────────────────────────────────────────────

export const highlightGroups = pgTable("highlight_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull(),
  icon: text("icon").$type<IconName>().notNull(),
  label: text("label").notNull(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  uniqueIndex("highlight_groups_slug_key").on(table.slug),
]);

export const highlights = pgTable("highlights", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => highlightGroups.id, { onDelete: "cascade" }),
  icon: text("icon").$type<IconName>().notNull(),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
}, (table) => [
  index("highlights_group_idx").on(table.groupId, table.sortOrder),
]);

// ── Contact ──────────────────────────────────────────────────────────────────

export const contactLinks = pgTable("contact_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  icon: text("icon").$type<IconName>().notNull(),
  label: text("label").notNull(),
  /** Display text — e.g. the address itself, not the `mailto:` target. */
  value: text("value").notNull(),
  href: text("href").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: boolean("visible").notNull().default(true),
  ...timestamps,
});

export const socialLinks = pgTable("social_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  icon: text("icon").$type<IconName>().notNull(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  showInHeader: boolean("show_in_header").notNull().default(true),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const navItems = pgTable("nav_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: text("label").notNull(),
  href: text("href").notNull(),
  showInHeader: boolean("show_in_header").notNull().default(true),
  showInFooter: boolean("show_in_footer").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

// ── Inbox ────────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  /**
   * Salted SHA-256 of the sender's IP. Enough to rate-limit a repeat
   * submitter without storing personal data in plaintext.
   */
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("messages_created_idx").on(table.createdAt.desc()),
  index("messages_unread_idx").on(table.isRead, table.isArchived),
]);

// ── Media library ────────────────────────────────────────────────────────────

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicId: text("public_id").notNull(),
  url: text("url").notNull(),
  width: integer("width"),
  height: integer("height"),
  format: text("format"),
  bytes: integer("bytes"),
  alt: text("alt").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("media_public_id_key").on(table.publicId),
  index("media_created_idx").on(table.createdAt.desc()),
]);

// ── Relations ────────────────────────────────────────────────────────────────

export const skillGroupsRelations = relations(skillGroups, ({ many }) => ({
  skills: many(skills),
}));

export const skillsRelations = relations(skills, ({ one }) => ({
  group: one(skillGroups, {
    fields: [skills.groupId],
    references: [skillGroups.id],
  }),
  level: one(skillLevels, {
    fields: [skills.levelId],
    references: [skillLevels.id],
  }),
}));

export const skillLevelsRelations = relations(skillLevels, ({ many }) => ({
  skills: many(skills),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  category: one(projectCategories, {
    fields: [projects.categoryId],
    references: [projectCategories.id],
  }),
}));

export const projectCategoriesRelations = relations(
  projectCategories,
  ({ many }) => ({ projects: many(projects) }),
);

export const highlightGroupsRelations = relations(
  highlightGroups,
  ({ many }) => ({ highlights: many(highlights) }),
);

export const highlightsRelations = relations(highlights, ({ one }) => ({
  group: one(highlightGroups, {
    fields: [highlights.groupId],
    references: [highlightGroups.id],
  }),
}));

// ── Inferred row types ───────────────────────────────────────────────────────

export type AdminUser = typeof adminUsers.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type Profile = typeof profile.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type SectionKey = (typeof sectionKey.enumValues)[number];
export type CoreStackItem = typeof coreStackItems.$inferSelect;
export type SkillLevel = typeof skillLevels.$inferSelect;
export type SkillGroup = typeof skillGroups.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type Experience = typeof experiences.$inferSelect;
export type ProjectCategory = typeof projectCategories.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type HighlightGroup = typeof highlightGroups.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
export type ContactLink = typeof contactLinks.$inferSelect;
export type SocialLink = typeof socialLinks.$inferSelect;
export type NavItem = typeof navItems.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type MediaAsset = typeof media.$inferSelect;
