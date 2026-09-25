"use client";

import { useReveal } from "./use-reveal";
import { cn } from "@/lib/utils";

type RevealTag = "div" | "p" | "li" | "ul" | "dl";

type RevealProps<T extends RevealTag> = {
  /** @default "div" */
  as?: T;
  /** Pixels the element rises from. Set 0 to skip the vertical offset. */
  y?: number;
  /** Pixels the element slides in from horizontally. */
  x?: number;
  delay?: number;
  duration?: number;
  /** How far inside the viewport edge before revealing, in px — see `useReveal`. */
  margin?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "className" | "children">;

/**
 * Drop-in replacement for the `motion.p` / `motion.div` / … one-shot reveal
 * pattern used across the public sections: fade up once, on scroll into
 * view. Every call site here used exactly `initial` + `whileInView` +
 * `viewport={{ once: true }}` — never `exit`, never a shared layout
 * animation — so nothing here is lost by not being framer-motion; the
 * sections that still need real animation (the mobile nav drawer, the
 * project grid's filter transition) keep using it.
 */
export function Reveal<T extends RevealTag = "div">({
  as,
  y = 16,
  x = 0,
  delay = 0,
  duration = 0.5,
  margin = 80,
  className,
  children,
  ...rest
}: RevealProps<T>) {
  const Tag = (as ?? "div") as React.ElementType;
  const { ref, visible } = useReveal<HTMLElement>(margin);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", className)}
      data-visible={visible || undefined}
      style={
        {
          "--reveal-x": `${x}px`,
          "--reveal-y": `${y}px`,
          "--reveal-duration": `${duration}s`,
          "--reveal-delay": `${delay}s`,
        } as React.CSSProperties
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
