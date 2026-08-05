"use client";

import { useCallback } from "react";

import { cn } from "@/lib/utils";

/**
 * Card with a highlight that tracks the cursor.
 *
 * Two deliberate choices:
 *
 * - Position is written to CSS custom properties on the element, not to React
 *   state. Moving the mouse repaints one gradient and triggers no re-render; a
 *   state-driven version fires dozens of renders per second and janks the page.
 *
 * - The element comes from `event.currentTarget` rather than a ref, which keeps
 *   the polymorphic `as` prop free of the ref-variance problem that a
 *   `useRef<HTMLDivElement>` would introduce for `article` and `li`.
 *
 * The effect is decorative and pointer-only — it adds nothing for keyboard or
 * touch users, and takes nothing away from them either.
 */
export function SpotlightCard({
  className,
  children,
  as: Component = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "article" | "li";
}) {
  const onMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <Component
      onMouseMove={onMouseMove}
      className={cn(
        "group/spotlight relative overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-300 hover:border-primary/40",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px z-0 opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background:
            "radial-gradient(320px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.12), transparent 70%)",
        }}
      />
      {children}
    </Component>
  );
}
