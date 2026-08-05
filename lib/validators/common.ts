import { z } from "zod";

import {
  COLOR_TOKEN_NAMES,
  HERO_BADGE_POSITION_NAMES,
  ICON_NAMES,
  type ColorToken,
  type HeroBadgePosition,
  type IconName,
} from "@/lib/design-tokens";

/**
 * Primitives shared by every content schema.
 *
 * These schemas run in two places from a single definition: in the browser via
 * `zodResolver` for instant feedback, and again inside the server action, which
 * is the only check that actually protects the database. Client-side validation
 * is a convenience; the server-side pass is the boundary.
 */

/** Trims, then rejects empty — HTML inputs submit whitespace as content. */
export const requiredText = (field: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be ${max} characters or fewer`);

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .default("");

/**
 * An empty input arrives as `""`, which `z.string().url()` rejects. Cleared
 * fields must become `null` so the column reads as "not set" rather than "set
 * to the empty string".
 */
export const optionalUrl = z
  .union([z.literal(""), z.string().trim().url("Enter a valid URL")])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null);

/** Accepts absolute URLs plus site-relative paths such as `/Rajan_CV.pdf`. */
export const optionalHref = z
  .union([
    z.literal(""),
    z
      .string()
      .trim()
      .refine(
        (value) =>
          value.startsWith("/") ||
          value.startsWith("#") ||
          /^(https?:|mailto:|tel:)/.test(value),
        "Enter a URL, a mailto:/tel: link, or a path starting with / or #",
      ),
  ])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .default(null);

export const requiredHref = z
  .string()
  .trim()
  .min(1, "Link is required")
  .refine(
    (value) =>
      value.startsWith("/") ||
      value.startsWith("#") ||
      /^(https?:|mailto:|tel:)/.test(value),
    "Enter a URL, a mailto:/tel: link, or a path starting with / or #",
  );

/**
 * Token enums.
 *
 * The casts widen a `T[]` into the non-empty tuple `z.enum` requires, but keep
 * the literal union intact — writing `as [string, ...string[]]` would infer
 * these as plain `string` and quietly break assignment to the typed jsonb
 * columns that store them.
 */
export const iconName = z.enum(ICON_NAMES as [IconName, ...IconName[]], {
  errorMap: () => ({ message: "Choose an icon" }),
});

export const colorToken = z.enum(
  COLOR_TOKEN_NAMES as [ColorToken, ...ColorToken[]],
  { errorMap: () => ({ message: "Choose a colour" }) },
);

export const heroBadgePosition = z.enum(
  HERO_BADGE_POSITION_NAMES as [HeroBadgePosition, ...HeroBadgePosition[]],
  { errorMap: () => ({ message: "Choose a position" }) },
);

export const uuid = z.string().uuid("Invalid identifier");

/**
 * Repeatable free-text lists (paragraphs, bullets, tech badges).
 * Blank rows are dropped rather than rejected — an editor adding a row and
 * changing their mind shouldn't have to delete it before saving.
 */
export const textList = (max = 500) =>
  z
    .array(z.string().trim().max(max))
    .default([])
    .transform((items) => items.filter((item) => item.length > 0));

/**
 * URL-safe slug. Generated from the title by default but editable, since
 * changing it changes a public identifier.
 */
export const slug = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and single hyphens",
  );

/** Payload for a drag-and-drop reorder: the ids in their new order. */
export const reorderSchema = z.object({
  ids: z.array(uuid).min(1, "Nothing to reorder"),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

/** Derives a slug from a title; the admin forms use this to prefill. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    // Strip the combining marks NFKD leaves behind, so "Ünïcode" → "unicode".
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
