import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ADMIN_NAV } from "@/components/admin/nav-config";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/guard";
import { getDashboardStats, getFallbackAreas } from "@/lib/queries/admin";
import { resolveIcon } from "@/lib/design-tokens";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [admin, stats, fallbackAreas] = await Promise.all([
    requireAdmin(),
    getDashboardStats(),
    getFallbackAreas(),
  ]);

  const firstName = admin.name.split(" ")[0];

  const cards = [
    {
      label: "Projects",
      value: stats.projects,
      detail: `${stats.liveProjects} live`,
      href: "/admin/projects",
    },
    {
      label: "Roles",
      value: stats.experiences,
      detail: "in your timeline",
      href: "/admin/experience",
    },
    {
      label: "Skill groups",
      value: stats.skillGroups,
      detail: "on the skills grid",
      href: "/admin/skills",
    },
    {
      label: "Unread messages",
      value: stats.unreadMessages,
      detail: stats.unreadMessages === 1 ? "enquiry waiting" : "enquiries waiting",
      href: "/admin/messages",
      highlight: stats.unreadMessages > 0,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Everything on your portfolio is editable from here. Changes go live as soon as you save."
      />

      {fallbackAreas.length > 0 ? (
        <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-5 py-4">
          <p className="text-sm font-medium text-foreground">
            Some sections are showing starter content
          </p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Your live site never renders blank — anything you haven&apos;t filled
            in falls back to the bundled example content. These areas are still
            using it:{" "}
            <span className="font-medium text-foreground">
              {fallbackAreas.join(", ")}
            </span>
            . Add your own and it takes over immediately.
          </p>
        </div>
      ) : null}

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`group rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 ${
              card.highlight ? "border-primary/40" : "border-border"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="space-y-8">
        {ADMIN_NAV.filter((group) => group.label !== "Overview").map((group) => (
          <section key={group.label} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((item) => {
                const Icon = resolveIcon(item.icon);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon aria-hidden className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {item.label}
                      </span>
                      <span className="block text-xs text-muted-foreground text-pretty">
                        {item.description}
                      </span>
                    </span>

                    <ArrowRight
                      aria-hidden
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
