"use client";

import { useState } from "react";

import type { DailyPoint } from "@/lib/queries/analytics";
import { cn } from "@/lib/utils";

/**
 * Daily views and unique visitors.
 *
 * Hand-built rather than pulling in a charting library: fourteen grouped bars
 * need no scales, no layout engine and no 100KB of JavaScript, and doing it
 * directly is the only way to hold the mark specs exactly — thin bars, a 2px
 * surface gap between the pair, rounded ends anchored to the baseline.
 *
 * Both series are counts of the same thing on one axis. There is deliberately
 * no second y-scale: visitors are always a subset of views, so a shared axis is
 * what makes the gap between the two bars mean something.
 */
export function ViewsChart({ data }: { data: DailyPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  /*
   * `Math.max(1, …)` guards the divide-by-zero on a site with no traffic yet.
   * The 1.15 headroom stops the tallest bar butting against the top gridline,
   * which otherwise reads as a clipped axis rather than a peak.
   */
  const peak = Math.max(1, ...data.map((point) => point.views)) * 1.15;
  const total = data.reduce((sum, point) => sum + point.views, 0);

  const formatDay = (iso: string) =>
    new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
    }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Last {data.length} days</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total.toLocaleString()} page view{total === 1 ? "" : "s"}
          </p>
        </div>

        {/* Two series always carry a legend — identity is never colour alone. */}
        <ul className="flex items-center gap-4">
          {[
            { label: "Views", color: "var(--chart-views)" },
            { label: "Visitors", color: "var(--chart-visitors)" },
          ].map((series) => (
            <li
              key={series.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: series.color }}
              />
              {series.label}
            </li>
          ))}
        </ul>
      </header>

      <div className="relative">
        {/* Recessive gridlines: present enough to read a value against, quiet
            enough that the bars stay the subject. */}
        <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="h-px w-full bg-border/60" />
          ))}
        </div>

        <div className="relative flex h-44 items-end gap-1">
          {data.map((point, index) => {
            const isHovered = hovered === index;

            return (
              <div
                key={point.date}
                className="group relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Hit target spans the full column height, not just the bar —
                    a 3px-tall bar is otherwise almost impossible to hover. */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-md transition-colors",
                    isHovered && "bg-muted/60",
                  )}
                />

                {/* 2px gap between the pair keeps the fills from reading as
                    one shape. */}
                <div className="relative flex h-full w-full items-end justify-center gap-[2px] px-[3px]">
                  <Bar
                    value={point.views}
                    peak={peak}
                    color="var(--chart-views)"
                  />
                  <Bar
                    value={point.visitors}
                    peak={peak}
                    color="var(--chart-visitors)"
                  />
                </div>

                {isHovered ? (
                  <div
                    role="tooltip"
                    className={cn(
                      "pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-lg border border-border bg-popover px-3 py-2 shadow-lg",
                      // Keep the first and last tooltips inside the card.
                      index < 2 && "left-0",
                      index > data.length - 3 && "right-0",
                    )}
                  >
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatDay(point.date)}
                    </p>
                    <dl className="mt-1 space-y-0.5">
                      <TooltipRow
                        label="Views"
                        value={point.views}
                        color="var(--chart-views)"
                      />
                      <TooltipRow
                        label="Visitors"
                        value={point.visitors}
                        color="var(--chart-visitors)"
                      />
                    </dl>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Only the endpoints are labelled — fourteen dates would collide. */}
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{data.length > 0 ? formatDay(data[0].date) : null}</span>
        <span>
          {data.length > 0 ? formatDay(data[data.length - 1].date) : null}
        </span>
      </div>

      {/*
        The same numbers as a table. Colour and height carry the story for
        sighted users; this is what a screen reader — or anyone who needs an
        exact figure — actually reads.
      */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          View as table
        </summary>
        <table className="mt-3 w-full text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="pb-1 font-medium">Date</th>
              <th scope="col" className="pb-1 text-right font-medium">Views</th>
              <th scope="col" className="pb-1 text-right font-medium">Visitors</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {data.map((point) => (
              <tr key={point.date} className="border-t border-border">
                <td className="py-1">{point.date}</td>
                <td className="py-1 text-right">{point.views}</td>
                <td className="py-1 text-right">{point.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

function Bar({
  value,
  peak,
  color,
}: {
  value: number;
  peak: number;
  color: string;
}) {
  // A visible stub for zero days, so "no traffic" reads as a measured zero
  // rather than as missing data.
  const height = value === 0 ? 2 : Math.max(3, (value / peak) * 100);

  return (
    <div
      className="w-full max-w-[10px] rounded-t-[4px] transition-[height] duration-300"
      style={{
        height: value === 0 ? `${height}px` : `${height}%`,
        background: value === 0 ? "hsl(var(--border))" : color,
      }}
    />
  );
}

function TooltipRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* Values wear text tokens, never the series colour. */}
      <dd className="ml-auto font-mono text-xs font-medium tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
