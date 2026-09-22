import { z } from "zod";

import {
  colorToken,
  heroBadgePosition,
  iconName,
  optionalHref,
  optionalImageSrc,
  optionalText,
  optionalUrl,
  requiredHref,
  requiredText,
  slug,
  textList,
  uuid,
} from "./common";

/**
 * One schema per editable surface, consumed by both the admin form
 * (`zodResolver`) and the server action that persists it.
 *
 * Input types are exported alongside so form components stay in lockstep with
 * the shape the action expects — renaming a field breaks compilation at both
 * ends rather than failing silently at runtime.
 */

// ── Site settings ────────────────────────────────────────────────────────────

export const siteSettingsSchema = z.object({
  brandPrefix: requiredText("Logo prefix", 24),
  brandName: requiredText("Logo name", 24),
  footerBrand: requiredText("Footer brand", 48),
  footerTagline: optionalText(300),
  metaTitle: requiredText("Meta title", 70),
  metaDescription: requiredText("Meta description", 200),
  metaKeywords: textList(60),
  ogImageUrl: optionalImageSrc,
  gaMeasurementId: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^G-[A-Z0-9]{6,}$/i, "Looks like G-XXXXXXXXXX"),
    ])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
});

export type SiteSettingsInput = z.input<typeof siteSettingsSchema>;

// ── Profile ──────────────────────────────────────────────────────────────────

export const heroBadgeSchema = z.object({
  label: requiredText("Badge label", 24),
  color: colorToken,
  position: heroBadgePosition,
});

export const profileSchema = z.object({
  greeting: optionalText(60),
  fullName: requiredText("Full name", 80),
  headline: optionalText(80),
  typewriterWords: z
    .array(z.object({ text: requiredText("Word", 32) }))
    .max(8, "Eight words is plenty for a typewriter loop")
    .default([]),
  availabilityLabel: optionalText(60),
  availabilityVisible: z.boolean().default(true),
  heroBio: requiredText("Hero bio", 600),
  openTo: textList(60),
  // Positions repeat freely; overlapping badges are a design choice, not an error.
  heroBadges: z.array(heroBadgeSchema).max(4, "Up to four badges").default([]),
  avatarUrl: optionalImageSrc,
  avatarPublicId: z.string().trim().nullable().default(null),
  location: optionalText(80),
  experienceYears: optionalText(12),
  experienceLabel: optionalText(60),
  cvUrl: optionalHref,
  aboutParagraphs: textList(1200),
  coreStackTitle: optionalText(60),
});

export type ProfileInput = z.input<typeof profileSchema>;

// ── Section headers ──────────────────────────────────────────────────────────

export const sectionSchema = z.object({
  eyebrow: optionalText(60),
  heading: optionalText(120),
  headingAccent: optionalText(120).transform((v) => v || null),
  subheading: optionalText(400).transform((v) => v || null),
  note: optionalText(200).transform((v) => v || null),
  visible: z.boolean().default(true),
});

export type SectionInput = z.input<typeof sectionSchema>;

// ── About: core stack ────────────────────────────────────────────────────────

export const coreStackItemSchema = z.object({
  icon: iconName,
  label: requiredText("Label", 120),
  visible: z.boolean().default(true),
});

export type CoreStackItemInput = z.input<typeof coreStackItemSchema>;

// ── Skills ───────────────────────────────────────────────────────────────────

export const skillGroupSchema = z.object({
  icon: iconName,
  label: requiredText("Kicker", 40),
  title: requiredText("Title", 60),
  visible: z.boolean().default(true),
});

export type SkillGroupInput = z.input<typeof skillGroupSchema>;

export const skillSchema = z.object({
  groupId: uuid,
  name: requiredText("Skill name", 60),
});

export type SkillInput = z.input<typeof skillSchema>;

// ── Services ─────────────────────────────────────────────────────────────────

export const serviceSchema = z.object({
  icon: iconName,
  title: requiredText("Title", 80),
  summary: optionalText(400),
  deliverables: textList(160),
  note: optionalText(60).transform((v) => v || null),
  featured: z.boolean().default(false),
  visible: z.boolean().default(true),
});

export type ServiceInput = z.input<typeof serviceSchema>;

// ── Experience ───────────────────────────────────────────────────────────────

export const experienceSchema = z.object({
  title: requiredText("Job title", 120),
  company: requiredText("Company", 120),
  period: requiredText("Period", 60),
  employmentType: optionalText(40),
  summary: optionalText(1000),
  bullets: textList(600),
  visible: z.boolean().default(true),
});

export type ExperienceInput = z.input<typeof experienceSchema>;

// ── Projects ─────────────────────────────────────────────────────────────────

export const projectCategorySchema = z.object({
  slug,
  label: requiredText("Label", 40),
});

export type ProjectCategoryInput = z.input<typeof projectCategorySchema>;

export const projectSchema = z.object({
  title: requiredText("Title", 160),
  slug,
  // `null` is a real state here: "Uncategorised" projects still show under All.
  categoryId: z
    .union([z.literal(""), uuid])
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .default(null),
  description: optionalText(1500),
  imageUrl: optionalImageSrc,
  imagePublicId: z.string().trim().nullable().default(null),
  tech: textList(40),
  demoUrl: optionalUrl,
  codeUrl: optionalUrl,
  imageAlt: optionalText(200),
  challenge: optionalText(2000),
  approach: optionalText(3000),
  outcome: optionalText(2000),
  featured: z.boolean().default(false),
  visible: z.boolean().default(true),
});

export type ProjectInput = z.input<typeof projectSchema>;

// ── Highlights ───────────────────────────────────────────────────────────────

export const highlightGroupSchema = z.object({
  slug,
  icon: iconName,
  label: requiredText("Kicker", 40),
  title: requiredText("Title", 60),
});

export type HighlightGroupInput = z.input<typeof highlightGroupSchema>;

export const highlightSchema = z.object({
  groupId: uuid,
  icon: iconName,
  text: requiredText("Text", 300),
});

export type HighlightInput = z.input<typeof highlightSchema>;

// ── Links ────────────────────────────────────────────────────────────────────

export const contactLinkSchema = z.object({
  icon: iconName,
  label: requiredText("Label", 40),
  value: requiredText("Display text", 120),
  href: requiredHref,
  visible: z.boolean().default(true),
});

export type ContactLinkInput = z.input<typeof contactLinkSchema>;

export const socialLinkSchema = z.object({
  icon: iconName,
  label: requiredText("Label", 40),
  href: requiredHref,
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
});

export type SocialLinkInput = z.input<typeof socialLinkSchema>;

export const navItemSchema = z.object({
  label: requiredText("Label", 40),
  href: requiredHref,
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(true),
});

export type NavItemInput = z.input<typeof navItemSchema>;

// ── Media ────────────────────────────────────────────────────────────────────

export const mediaSchema = z.object({
  publicId: requiredText("Public ID", 300),
  url: z.string().url(),
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  format: z.string().nullable().default(null),
  bytes: z.number().int().nonnegative().nullable().default(null),
  alt: optionalText(200),
});

export type MediaInput = z.input<typeof mediaSchema>;

// ── AI assistant ─────────────────────────────────────────────────────────────

/** Mirrors `MAX_ASSISTANT_QUESTIONS`; kept literal so this module stays import-light. */
const ASSISTANT_QUESTION_LIMIT = 8;

export const assistantSettingsSchema = z.object({
  assistantWelcome: optionalText(300),
  assistantPronouns: optionalText(40),
  assistantQuestions: textList(140).refine(
    (questions) => questions.length <= ASSISTANT_QUESTION_LIMIT,
    `Up to ${ASSISTANT_QUESTION_LIMIT} questions — the chat shows them as one-tap suggestions`,
  ),
});

export type AssistantSettingsInput = z.input<typeof assistantSettingsSchema>;
