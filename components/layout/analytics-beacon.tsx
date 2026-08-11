"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports a page view once per navigation.
 *
 * `sendBeacon` is used where available: the browser queues the request and
 * delivers it even if the tab is closing, and it never competes with the page's
 * own network work. `fetch` with `keepalive` is the fallback for the handful of
 * browsers that lack it.
 *
 * Renders nothing.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();

  /**
   * React 18+ mounts effects twice in development. Without this guard every
   * local page load would be counted as two, and the dashboard's numbers would
   * quietly be wrong in exactly the environment they're first looked at.
   */
  const lastReported = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastReported.current === pathname) return;
    lastReported.current = pathname;

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }

      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Analytics must never break the page it's measuring.
      });
    } catch {
      // Same: swallow. A missed view is not worth a runtime error.
    }
  }, [pathname]);

  return null;
}
