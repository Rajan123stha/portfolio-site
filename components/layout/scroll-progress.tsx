"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Reading-progress bar pinned under the header.
 *
 * `useScroll` writes to a MotionValue outside React's render cycle, so scrolling
 * repaints one transform and never re-renders the tree. The spring keeps it from
 * twitching on trackpads with momentum.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 40,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-gradient-to-r from-primary via-accent-2 to-primary"
    />
  );
}
