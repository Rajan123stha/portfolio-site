import { EmptyState } from "@/components/admin/page-header";
import type { Breakdown } from "@/lib/queries/analytics";

/**
 * Ranked magnitude across a handful of named things — referrers, countries,
 * devices.
 *
 * A bar per row rather than a pie: comparing lengths against a shared baseline
 * is far more accurate than comparing angles, and it degrades gracefully when
 * one entry dwarfs the rest. Every row is labelled and carries its number, so
 * nothing here depends on colour.
 */
export function BreakdownList({
  title,
  description,
  items,
  emptyMessage,
  formatLabel,
}: {
  title: string;
  description?: string;
  items: Breakdown[];
  emptyMessage: string;
  formatLabel?: (label: string) => string;
}) {
  const peak = Math.max(1, ...items.map((item) => item.views));
  const total = items.reduce((sum, item) => sum + item.views, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </header>

      {items.length === 0 ? (
        <EmptyState title="Nothing yet" description={emptyMessage} />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const share = total === 0 ? 0 : Math.round((item.views / total) * 100);

            return (
              <li key={item.label} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="truncate text-sm text-foreground">
                    {formatLabel ? formatLabel(item.label) : item.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {item.views.toLocaleString()}
                    <span className="ml-1.5 text-muted-foreground/60">
                      {share}%
                    </span>
                  </span>
                </div>

                {/* Decorative: the count and share are already stated above, so
                    a progressbar role would only repeat them. */}
                <div
                  aria-hidden
                  className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.08]"
                >
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${Math.max(2, (item.views / peak) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Turns an ISO country code into a readable name, falling back to the code. */
export function countryName(code: string): string {
  try {
    return (
      new Intl.DisplayNames(undefined, { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}
