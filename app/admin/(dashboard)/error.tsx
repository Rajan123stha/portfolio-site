"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

/**
 * Catches anything that escapes an admin page's render — a server action
 * that threw instead of returning `{ ok: false }`, a network blip, a bug — so
 * it lands on a page with a retry button rather than Next's default full-page
 * crash screen.
 *
 * There was no `error.tsx` anywhere in the app before this: any uncaught
 * client exception, in any admin page, showed "Application error: a
 * client-side exception has occurred" with no way back except a hard reload.
 * The reorder crash this file was added alongside is one way to reach that
 * state, but not the only one — this catches the rest of them too.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert aria-hidden className="h-6 w-6" />
      </span>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">Something went wrong</p>
        <p className="max-w-sm text-sm text-muted-foreground text-pretty">
          That action didn’t go through — often just a slow connection. Nothing else on this page
          was affected.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">Ref: {error.digest}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <RotateCcw aria-hidden className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}
