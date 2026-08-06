"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { GitBranch } from "lucide-react";

import type { ProfileView } from "@/lib/queries/public";
import { cn } from "@/lib/utils";

/**
 * The hero's visual anchor: a syntax-highlighted source file that types itself
 * out, built from the same profile data the rest of the page uses.
 *
 * It replaces the portrait for two reasons. It's on-subject — a developer's
 * portfolio introducing them in code says more than a headshot — and it stays
 * correct automatically, because every value comes from the CMS rather than
 * being duplicated in an image.
 *
 * Tokens are produced by `buildLines` rather than parsed from a string. The
 * content is generated here, so its structure is already known; running a
 * highlighter over text we just serialised would be work done twice, and would
 * pull in a parser for no benefit.
 */

type TokenKind =
  | "keyword"
  | "type"
  | "property"
  | "string"
  | "literal"
  | "punctuation"
  | "comment";

type Token = { text: string; kind: TokenKind };
type Line = Token[];

/** Literal classes so Tailwind's compiler can see every one of them. */
const TOKEN_CLASS: Record<TokenKind, string> = {
  keyword: "text-violet-600 dark:text-violet-400",
  type: "text-amber-600 dark:text-amber-300",
  property: "text-sky-700 dark:text-sky-300",
  string: "text-emerald-600 dark:text-emerald-400",
  literal: "text-orange-600 dark:text-orange-400",
  punctuation: "text-muted-foreground",
  comment: "italic text-muted-foreground/70",
};

const t = (text: string, kind: TokenKind): Token => ({ text, kind });

/** `"value",` — the shape almost every line in the object shares. */
function stringLine(indent: string, key: string, value: string): Line {
  return [
    t(indent, "punctuation"),
    t(key, "property"),
    t(": ", "punctuation"),
    t(`"${value}"`, "string"),
    t(",", "punctuation"),
  ];
}

function buildLines(profile: ProfileView): Line[] {
  const stack = profile.heroBadges.map((badge) => badge.label);
  const experience = [profile.experienceYears, profile.experienceLabel]
    .filter(Boolean)
    .join(" ");

  const lines: Line[] = [
    [
      t("const", "keyword"),
      t(" developer", "type"),
      t(": ", "punctuation"),
      t("Profile", "type"),
      t(" = {", "punctuation"),
    ],
    stringLine("  ", "name", profile.fullName),
  ];

  if (profile.location) lines.push(stringLine("  ", "location", profile.location));
  if (experience) lines.push(stringLine("  ", "experience", experience));

  if (stack.length > 0) {
    lines.push([
      t("  ", "punctuation"),
      t("stack", "property"),
      t(": [", "punctuation"),
      // Commas belong between items, not after the last one.
      ...stack.flatMap((item, index): Token[] => [
        t(`"${item}"`, "string"),
        ...(index < stack.length - 1 ? [t(", ", "punctuation")] : []),
      ]),
      t("],", "punctuation"),
    ]);
  }

  if (profile.openTo.length > 0) {
    lines.push([
      t("  ", "punctuation"),
      t("openTo", "property"),
      t(": [", "punctuation"),
    ]);
    for (const item of profile.openTo) {
      lines.push([
        t("    ", "punctuation"),
        t(`"${item}"`, "string"),
        t(",", "punctuation"),
      ]);
    }
    lines.push([t("  ], ", "punctuation")]);
  }

  lines.push([
    t("  ", "punctuation"),
    t("available", "property"),
    t(": ", "punctuation"),
    t(String(profile.availabilityVisible), "literal"),
    t(",", "punctuation"),
  ]);

  lines.push([t("};", "punctuation")]);

  return lines;
}

/** Newlines count as a character so the caret pauses at each line break. */
function totalLength(lines: Line[]): number {
  return lines.reduce(
    (sum, line) =>
      sum + line.reduce((lineSum, token) => lineSum + token.text.length, 0) + 1,
    0,
  );
}

export function CodeCard({
  profile,
  className,
}: {
  profile: ProfileView;
  className?: string;
}) {
  const lines = useMemo(() => buildLines(profile), [profile]);
  const total = useMemo(() => totalLength(lines), [lines]);

  const reducedMotion = useReducedMotion();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    // Typing is decorative. Anyone who asked for less motion gets the finished
    // file immediately rather than a slower version of the same effect.
    if (reducedMotion) {
      setRevealed(total);
      return;
    }

    setRevealed(0);
    const start = performance.now();
    const CHARS_PER_SECOND = 90;
    let frame = 0;

    /*
     * Driven by elapsed time inside rAF rather than a fixed-interval timer, so
     * the speed is the same on every display and the browser can skip work
     * while the tab is backgrounded.
     */
    const tick = (now: number) => {
      const next = Math.min(
        total,
        Math.floor(((now - start) / 1000) * CHARS_PER_SECOND),
      );
      setRevealed(next);
      if (next < total) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [total, reducedMotion]);

  const done = revealed >= total;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card",
        className,
      )}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-3 border-b border-border bg-elevated px-4 py-3">
        <div aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          profile.ts
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
          TypeScript
        </span>
      </div>

      {/*
        `aria-hidden` because every value here is already stated in the hero's
        real prose. A screen reader shouldn't have to sit through the same
        details a second time, punctuation and all.
      */}
      <div
        aria-hidden
        /*
         * Fixed at 12px rather than scaling up on wider viewports. The longest
         * generated line (`stack: [...]`) has to fit the card's width, and at
         * 13px it overflowed into the horizontal scroll — technically fine, but
         * a permanently clipped line reads as a layout bug.
         */
        className="overflow-x-auto p-4 font-mono text-[12px] leading-[1.9]"
      >
        <pre className="min-w-max">
          <code>
            {lines.map((line, lineIndex) => {
              // Characters consumed by every earlier line, newline included.
              const before = lines
                .slice(0, lineIndex)
                .reduce(
                  (sum, l) =>
                    sum +
                    l.reduce((s, token) => s + token.text.length, 0) +
                    1,
                  0,
                );

              const lineLength = line.reduce(
                (sum, token) => sum + token.text.length,
                0,
              );
              const available = revealed - before;

              /*
               * Every line is rendered from the first frame, even before any of
               * its characters are due. Skipping un-typed lines would let the
               * card grow a row at a time and shove the rest of the hero down
               * with it — a self-inflicted layout shift for the length of the
               * animation. Reserving the full height costs nothing.
               */
              let consumed = 0;
              const isCaretLine =
                !done && available >= 0 && available <= lineLength;

              return (
                <div key={lineIndex} className="flex gap-4">
                  <span className="w-4 shrink-0 select-none text-right text-muted-foreground/40">
                    {lineIndex + 1}
                  </span>

                  <span className="whitespace-pre">
                    {line.map((token, tokenIndex) => {
                      const start = consumed;
                      consumed += token.text.length;
                      const visible = Math.max(
                        0,
                        Math.min(token.text.length, available - start),
                      );
                      if (visible === 0) return null;

                      return (
                        <span
                          key={tokenIndex}
                          className={TOKEN_CLASS[token.kind]}
                        >
                          {token.text.slice(0, visible)}
                        </span>
                      );
                    })}

                    {isCaretLine ? (
                      <span className="ml-px inline-block h-[1.1em] w-[2px] translate-y-[0.2em] animate-pulse bg-primary" />
                    ) : null}
                  </span>
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {/*
        Editor-style status bar. It deliberately avoids repeating the
        availability pill from the hero's left column — the same signal twice,
        a few hundred pixels apart, reads as an oversight rather than emphasis.
      */}
      <div className="flex items-center gap-3 border-t border-border bg-elevated px-4 py-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
          <GitBranch aria-hidden className="h-3 w-3" />
          main
        </span>

        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          {lines.length} lines · UTF-8
        </span>
      </div>
    </div>
  );
}
