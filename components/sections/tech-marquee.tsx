"use client";

import { cn } from "@/lib/utils";

/**
 * Continuously scrolling strip of technologies.
 *
 * The list is rendered twice inside a track that translates by exactly -50%, so
 * the second copy is in the first copy's starting position when the animation
 * loops — the seam is never visible. The duplicate is `aria-hidden`, so screen
 * readers hear the list once.
 *
 * Pure CSS transform: no scroll listener, no timer, and the compositor handles
 * it off the main thread.
 */
export function TechMarquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "mask-edges relative flex overflow-hidden py-2",
        className,
      )}
    >
      <div className="animate-marquee flex shrink-0 items-center gap-3 pr-3 motion-reduce:animate-none">
        {items.map((item) => (
          <TechChip key={item} label={item} />
        ))}
      </div>
      <div
        aria-hidden
        className="animate-marquee flex shrink-0 items-center gap-3 pr-3 motion-reduce:hidden"
      >
        {items.map((item) => (
          <TechChip key={item} label={item} />
        ))}
      </div>
    </div>
  );
}

function TechChip({ label }: { label: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 font-mono text-xs text-muted-foreground">
      {label}
    </span>
  );
}
