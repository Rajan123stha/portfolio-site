import type { IconName } from "@/lib/design-tokens";

/**
 * Admin navigation, grouped so the sidebar mirrors how the public page reads
 * top to bottom. Kept as data in one place so the sidebar, the mobile drawer
 * and the dashboard's quick links can never drift apart.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: IconName;
  description: string;
  /** Renders the unread-message count. */
  badge?: "unreadMessages";
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: "Gauge",
        description: "At-a-glance status of your site",
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: "LineChart",
        description: "Visitors, referrers and traffic trends",
      },
      {
        href: "/admin/messages",
        label: "Messages",
        icon: "MessageSquare",
        description: "Enquiries from the contact form",
        badge: "unreadMessages",
      },
    ],
  },
  {
    label: "Content",
    items: [
      {
        href: "/admin/profile",
        label: "Profile & hero",
        icon: "Users",
        description: "Your name, bio, portrait and CV",
      },
      {
        href: "/admin/sections",
        label: "Section headers",
        icon: "Layers",
        description: "Headings, ledes and visibility",
      },
      {
        href: "/admin/skills",
        label: "Skills",
        icon: "Code2",
        description: "Groups, skills and proficiency tiers",
      },
      {
        href: "/admin/experience",
        label: "Experience",
        icon: "Briefcase",
        description: "Roles, dates and achievements",
      },
      {
        href: "/admin/projects",
        label: "Projects",
        icon: "Boxes",
        description: "Portfolio pieces and categories",
      },
      {
        href: "/admin/highlights",
        label: "Why work with me",
        icon: "Sparkles",
        description: "Strengths and what you're learning",
      },
    ],
  },
  {
    label: "Site",
    items: [
      {
        href: "/admin/links",
        label: "Navigation & links",
        icon: "Link",
        description: "Menu, social and contact links",
      },
      {
        href: "/admin/media",
        label: "Media",
        icon: "Monitor",
        description: "Uploaded images",
      },
      {
        href: "/admin/settings",
        label: "Settings & SEO",
        icon: "Wrench",
        description: "Branding, metadata and analytics",
      },
      {
        href: "/admin/account",
        label: "Account",
        icon: "Shield",
        description: "Your login and password",
      },
    ],
  },
];

/** Flat list, used for breadcrumb/title lookup. */
export const ADMIN_NAV_ITEMS = ADMIN_NAV.flatMap((group) => group.items);
