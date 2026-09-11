"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile, loaded only once the chat has been opened.
 *
 * Most visitors never open the chat, so the third-party script isn't part of
 * the page load. The widget runs in "interaction-only" mode: for nearly
 * everyone it passes invisibly, and it only asks for a click when Cloudflare
 * is unsure.
 *
 * Tokens are single-use, so each one is handed out once and a fresh challenge
 * starts immediately — the next conversation doesn't wait for it.
 */

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** How long a question waits for a token before going without one. */
const TOKEN_WAIT_MS = 20_000;

let scriptLoading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  scriptLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });

  return scriptLoading;
}

export function useTurnstile(siteKey: string | null, active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<Array<(token: string | null) => void>>([]);
  const [interactive, setInteractive] = useState(false);

  const settle = useCallback((value: string | null) => {
    const resolvers = waiting.current;
    waiting.current = [];
    for (const resolve of resolvers) resolve(value);
  }, []);

  useEffect(() => {
    if (!siteKey || !active || widgetId.current) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "assistant",
          appearance: "interaction-only",
          theme: "auto",
          size: "flexible",
          callback: (value: string) => {
            token.current = value;
            settle(value);
          },
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            token.current = null;
            settle(null);
          },
          "before-interactive-callback": () => setInteractive(true),
          "after-interactive-callback": () => setInteractive(false),
        });
      })
      .catch(() => settle(null));

    return () => {
      cancelled = true;
    };
  }, [siteKey, active, settle]);

  useEffect(
    () => () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    },
    [],
  );

  /**
   * A token for one request, or `null` when there's no bot check configured
   * (or it couldn't produce one in time — the server then decides).
   */
  const takeToken = useCallback(async (): Promise<string | null> => {
    if (!siteKey) return null;

    const value =
      token.current ??
      (await new Promise<string | null>((resolve) => {
        waiting.current.push(resolve);
        setTimeout(() => resolve(null), TOKEN_WAIT_MS);
      }));

    // Spent on this request; start earning the next one straight away.
    token.current = null;
    if (widgetId.current) window.turnstile?.reset(widgetId.current);

    return value;
  }, [siteKey]);

  return { containerRef, takeToken, interactive, enabled: Boolean(siteKey) };
}
