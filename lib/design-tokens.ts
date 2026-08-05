import {
  Award,
  BookOpen,
  Boxes,
  Brain,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Code2,
  Container,
  Cpu,
  Database,
  FileCode,
  Figma,
  FlaskConical,
  Gauge,
  GitBranch,
  Github,
  Globe,
  Heart,
  Instagram,
  Layers,
  Lightbulb,
  LineChart,
  Link as LinkIcon,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  PenTool,
  Phone,
  Rocket,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Terminal,
  Users,
  Workflow,
  Wrench,
  Youtube,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Icons and colours are chosen in the admin panel and stored in Postgres as
 * *keys*, then resolved here.
 *
 * The indirection is not decoration. Tailwind's compiler scans source files for
 * literal class names; a class assembled at runtime from a database column
 * (`` `bg-${row.color}-500` ``) is never emitted into the stylesheet and renders
 * unstyled in production. Keeping every class as a literal in this file keeps
 * the content editable *and* the CSS correct.
 */

// ── Icons ────────────────────────────────────────────────────────────────────

export const ICONS = {
  Award,
  BookOpen,
  Boxes,
  Brain,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Code2,
  Container,
  Cpu,
  Database,
  Figma,
  FileCode,
  FlaskConical,
  Gauge,
  GitBranch,
  Github,
  Globe,
  Heart,
  Instagram,
  Layers,
  Lightbulb,
  LineChart,
  Link: LinkIcon,
  Linkedin,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  PenTool,
  Phone,
  Rocket,
  Server,
  Shield,
  Smartphone,
  Sparkles,
  Star,
  Target,
  Terminal,
  Users,
  Workflow,
  Wrench,
  Youtube,
  Zap,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** Icon lookup that degrades to a neutral glyph rather than crashing a page. */
export function resolveIcon(name: string | null | undefined): LucideIcon {
  return ICONS[name as IconName] ?? Sparkles;
}

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && value in ICONS;
}

// ── Colours ──────────────────────────────────────────────────────────────────

/**
 * Every entry is a literal class string so Tailwind can see it.
 * `swatch` is what the admin colour picker renders.
 */
export const COLOR_TOKENS = {
  primary: { label: "Primary", swatch: "bg-primary", fill: "bg-primary" },
  primaryStrong: {
    label: "Primary 70%",
    swatch: "bg-primary/70",
    fill: "bg-primary/70",
  },
  primarySoft: {
    label: "Primary 40%",
    swatch: "bg-primary/40",
    fill: "bg-primary/40",
  },
  foreground: {
    label: "Foreground",
    swatch: "bg-foreground",
    fill: "bg-foreground",
  },
  sky: { label: "Sky", swatch: "bg-sky-500", fill: "bg-sky-500" },
  blue: { label: "Blue", swatch: "bg-blue-600", fill: "bg-blue-600" },
  indigo: { label: "Indigo", swatch: "bg-indigo-500", fill: "bg-indigo-500" },
  violet: { label: "Violet", swatch: "bg-violet-500", fill: "bg-violet-500" },
  cyan: { label: "Cyan", swatch: "bg-cyan-500", fill: "bg-cyan-500" },
  emerald: {
    label: "Emerald",
    swatch: "bg-emerald-500",
    fill: "bg-emerald-500",
  },
  amber: { label: "Amber", swatch: "bg-amber-500", fill: "bg-amber-500" },
  orange: { label: "Orange", swatch: "bg-orange-500", fill: "bg-orange-500" },
  rose: { label: "Rose", swatch: "bg-rose-500", fill: "bg-rose-500" },
  pink: { label: "Pink", swatch: "bg-pink-500", fill: "bg-pink-500" },
  slate: { label: "Slate", swatch: "bg-slate-500", fill: "bg-slate-500" },
} as const;

export type ColorToken = keyof typeof COLOR_TOKENS;

export const COLOR_TOKEN_NAMES = Object.keys(COLOR_TOKENS) as ColorToken[];

export function resolveColor(token: string | null | undefined): string {
  return (COLOR_TOKENS[token as ColorToken] ?? COLOR_TOKENS.primary).fill;
}

export function isColorToken(value: unknown): value is ColorToken {
  return typeof value === "string" && value in COLOR_TOKENS;
}

// ── Hero badge placement ─────────────────────────────────────────────────────

/**
 * Anchor points for the pills that overhang the hero portrait.
 *
 * Each pill sits partly outside the frame — that overlap is what makes them
 * read as floating above it rather than as a caption inside it.
 */
export const HERO_BADGE_POSITIONS = {
  "top-right": { label: "Top right", className: "absolute -right-5 top-10" },
  left: { label: "Left", className: "absolute -left-6 top-1/3" },
  "bottom-left": {
    label: "Bottom left",
    className: "absolute -left-5 bottom-28",
  },
  "bottom-right": {
    label: "Bottom right",
    className: "absolute -right-7 bottom-1/3",
  },
} as const;

export type HeroBadgePosition = keyof typeof HERO_BADGE_POSITIONS;

export const HERO_BADGE_POSITION_NAMES = Object.keys(
  HERO_BADGE_POSITIONS,
) as HeroBadgePosition[];

export function resolveBadgePosition(token: string | null | undefined): string {
  return (
    HERO_BADGE_POSITIONS[token as HeroBadgePosition] ??
    HERO_BADGE_POSITIONS["top-right"]
  ).className;
}
