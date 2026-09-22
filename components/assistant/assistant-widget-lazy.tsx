"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";

import type { AssistantWidget as Widget } from "./assistant-widget";

/**
 * Loads the chat only once the page is idle.
 *
 * The widget (panel, popovers, streaming, bot check) is a large client bundle
 * for a button in the corner. Shipping it with the page competed with the
 * content for the main thread on load — it's the kind of work that shows up as
 * Total Blocking Time. Deferred, it arrives a moment after the page is usable,
 * which is when anyone would reach for it anyway.
 */
const AssistantWidget = dynamic(
  () => import("./assistant-widget").then((module) => module.AssistantWidget),
  { ssr: false },
);

export function LazyAssistantWidget(props: ComponentProps<typeof Widget>) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(start, 1500);
    return () => clearTimeout(timer);
  }, []);

  return ready ? <AssistantWidget {...props} /> : null;
}
