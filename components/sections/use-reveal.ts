"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-triggered reveal, once — the IntersectionObserver framer-motion's
 * `whileInView` + `viewport={{ once: true }}` is itself built on, without the
 * rest of what shipping framer-motion for it costs: its animation engine,
 * layout-projection machinery and per-frame scheduler, all loaded and run to
 * do nothing more than fade an element in a single time.
 *
 * One `IntersectionObserver` per revealed element — a paragraph here, a skill
 * chip there — sounded harmless and wasn't: a page section easily has 40-80 of
 * these, and constructing that many separate observers at hydration measurably
 * cost *more* main-thread time under CPU throttling than framer-motion's own
 * viewport tracking did, which defeated the point. Every element asking for
 * the same `marginPx` instead shares one observer, keyed by that margin — the
 * pattern `IntersectionObserver` is actually meant for.
 *
 * `marginPx` matches framer's `viewport.margin` — a single value shrinks the
 * trigger zone that many pixels in from every edge of the viewport, so an
 * element reveals a little after it's actually visible rather than right at
 * the screen edge.
 */

type PoolEntry = {
  observer: IntersectionObserver;
  targets: Map<Element, () => void>;
};

const pools = new Map<number, PoolEntry>();

function poolFor(marginPx: number): PoolEntry {
  const existing = pools.get(marginPx);
  if (existing) return existing;

  const targets = new Map<Element, () => void>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const callback = targets.get(entry.target);
        if (!callback) continue;
        callback();
        observer.unobserve(entry.target);
        targets.delete(entry.target);
      }
    },
    { rootMargin: `-${marginPx}px` },
  );

  const entry: PoolEntry = { observer, targets };
  pools.set(marginPx, entry);
  return entry;
}

export function useReveal<T extends HTMLElement>(marginPx = 80) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const { observer, targets } = poolFor(marginPx);
    targets.set(el, () => setVisible(true));
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      targets.delete(el);
    };
  }, [marginPx]);

  return { ref, visible };
}
