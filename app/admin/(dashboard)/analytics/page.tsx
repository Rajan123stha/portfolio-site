import { TrendingDown, TrendingUp } from "lucide-react";

import {
  BreakdownList,
  countryName,
} from "@/components/admin/analytics/breakdown-list";
import { ViewsChart } from "@/components/admin/analytics/views-chart";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getAnalyticsSummary,
  getDailyViews,
  getDeviceBreakdown,
  getDirectShare,
  getTopCountries,
  getTopPages,
  getTopReferrers,
} from "@/lib/queries/analytics";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics" };

/** Live figures — a cached page would show yesterday's traffic. */
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAdmin();

  const [
    summary,
    daily,
    referrers,
    countries,
    devices,
    pages,
    directShare,
  ] = await Promise.all([
    getAnalyticsSummary(),
    getDailyViews(14),
    getTopReferrers(),
    getTopCountries(),
    getDeviceBreakdown(),
    getTopPages(),
    getDirectShare(),
  ]);

  const hasData = summary.viewsAllTime > 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="First-party traffic, measured on your own site and stored in your own database. No cookies, no third-party scripts."
      />

      {!hasData ? (
        <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-sm font-medium">No page views recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Visits are counted from the moment this deploys. Your own admin
            sessions are excluded, so open the public site in another tab to see
            the first row appear.
          </p>
        </div>
      ) : null}

      {/* Headline figures. A number this important is not a chart. */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Views today"
          value={summary.viewsToday}
          detail={`${summary.visitorsToday} visitor${summary.visitorsToday === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Views · 7 days"
          value={summary.views7d}
          detail={`${summary.visitors7d} unique`}
          trend={summary.trend7d}
        />
        <StatTile
          label="Views · 30 days"
          value={summary.views30d}
          detail={`${summary.visitors30d} unique`}
        />
        <StatTile
          label="All time"
          value={summary.viewsAllTime}
          detail={`${directShare}% direct`}
        />
      </div>

      <div className="space-y-5">
        <ViewsChart data={daily} />

        <div className="grid gap-5 lg:grid-cols-2">
          <BreakdownList
            title="Referrers"
            description="Where visitors came from, last 30 days"
            items={referrers}
            emptyMessage="All traffic so far has been direct — typed in, bookmarked, or from an app that strips the referrer."
          />

          <BreakdownList
            title="Countries"
            description="Last 30 days"
            items={countries}
            formatLabel={countryName}
            emptyMessage="Country data comes from the hosting platform's edge. It appears once deployed to Vercel."
          />

          <BreakdownList
            title="Devices"
            description="Last 30 days"
            items={devices}
            formatLabel={(label) => label[0].toUpperCase() + label.slice(1)}
            emptyMessage="No visits recorded yet."
          />

          <BreakdownList
            title="Pages"
            description="Last 30 days"
            items={pages}
            emptyMessage="No visits recorded yet."
          />
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground text-pretty">
        Visitors are counted with a hash of their IP and browser that is
        re-salted every day, so unique counts are accurate within a day and
        nobody can be followed across days. No IP address, cookie or device
        fingerprint is stored, and requests sending{" "}
        <code className="font-mono">Do Not Track</code> are ignored entirely.
      </p>
    </>
  );
}

function StatTile({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: number;
  detail: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {value.toLocaleString()}
        </p>

        {/* A trend needs a previous period to compare against; on a new site
            there isn't one, and an invented figure is worse than none. */}
        {typeof trend === "number" ? (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium tabular-nums",
              trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
          >
            {trend >= 0 ? (
              <TrendingUp aria-hidden className="h-3 w-3" />
            ) : (
              <TrendingDown aria-hidden className="h-3 w-3" />
            )}
            {trend >= 0 ? "+" : ""}
            {trend}%
          </span>
        ) : null}
      </div>

      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
