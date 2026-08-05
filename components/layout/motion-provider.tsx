"use client";

import { MotionConfig } from "framer-motion";

/**
 * Applies Framer Motion settings to the whole public site.
 *
 * This wrapper exists because the site layout is a server component, and
 * importing `framer-motion` there crosses the client boundary — the package's
 * barrel uses `export *`, which React Server Components reject outright.
 *
 * `reducedMotion="user"` makes Framer honour the OS preference. The
 * `prefers-reduced-motion` rule in globals.css only reaches CSS animations;
 * these components animate via inline styles, which it cannot touch.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
