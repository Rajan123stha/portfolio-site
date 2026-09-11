"use client";

import { Fragment, type ReactNode } from "react";
import {
  ArrowRight,
  Info,
  Mail,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AssistantCitation, AssistantSource, SegmentIssue } from "@/lib/assistant/protocol";
import { cn } from "@/lib/utils";
import { SOURCE_ICONS } from "./source-meta";
import type { AssistantMessage, Segment } from "./use-assistant-chat";

type Destination = Pick<AssistantSource, "href" | "fallbackHref">;

type AssistantAnswerProps = {
  message: AssistantMessage;
  firstName: string;
  /** Normalised URLs the portfolio publishes; nothing else becomes a link. */
  knownLinks: ReadonlySet<string>;
  onNavigate: (destination: Destination) => void;
  onRetry: () => void;
  onReset: () => void;
};

const CONTACT: Destination = { href: "#contact", fallbackHref: "#contact" };

/**
 * One assistant reply: streamed text with citation pills woven in where each
 * claim ends, flagged claims marked in place, then the sources and a verdict.
 */
export function AssistantAnswer({
  message,
  firstName,
  knownLinks,
  onNavigate,
  onRetry,
  onReset,
}: AssistantAnswerProps) {
  const { status, segments, summary, finish, error } = message;

  if (status === "pending") return <Checking />;

  if (finish === "blocked") {
    return (
      <Bubble>
        That’s outside what I can help with here. Try asking about {firstName}’s experience,
        projects or skills.
      </Bubble>
    );
  }

  const hasText = segments.some((segment) => segment.text.trim());
  const sources = numberSources(segments);

  return (
    <div className="space-y-2">
      {hasText ? (
        <Bubble>
          <AnswerBody
            segments={segments}
            sources={sources}
            knownLinks={knownLinks}
            onNavigate={onNavigate}
          />
          {status === "streaming" ? <Caret /> : null}
        </Bubble>
      ) : null}

      {sources.size > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="label-mono mr-0.5 text-[0.6rem] text-muted-foreground">Sources</span>
          {[...sources.values()].map(({ number, source }) => {
            const Icon = SOURCE_ICONS[source.kind];
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onNavigate(source)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span className="font-mono font-semibold text-primary">{number}</span>
                <Icon aria-hidden className="h-3 w-3 shrink-0" />
                <span className="truncate">{source.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {status === "done" && summary ? <Verdict summary={summary} /> : null}

      {status === "done" && finish === "truncated" ? (
        <Note>The answer was cut short. Ask a narrower question for the rest.</Note>
      ) : null}

      {status === "stopped" ? <Note>Stopped — this answer is incomplete and wasn’t checked.</Note> : null}

      {status === "error" && error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/[0.06] px-3.5 py-2.5 text-xs text-foreground"
        >
          <p className="text-pretty">{error.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {error.code === "conversation_reset" ? (
              <ActionChip onClick={onReset} icon={<RotateCcw className="h-3 w-3" />}>
                Start a new chat
              </ActionChip>
            ) : error.code === "rate_limited" || error.code === "disabled" ? (
              <ActionChip onClick={() => onNavigate(CONTACT)} icon={<Mail className="h-3 w-3" />}>
                Use the contact form
              </ActionChip>
            ) : (
              <ActionChip onClick={onRetry} icon={<RotateCcw className="h-3 w-3" />}>
                Try again
              </ActionChip>
            )}
          </div>
        </div>
      ) : null}

      {status === "done" && summary?.hasGap ? (
        <button
          type="button"
          onClick={() => onNavigate(CONTACT)}
          className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Ask {firstName} directly
          <ArrowRight aria-hidden className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      ) : null}
    </div>
  );
}

// ── Body ─────────────────────────────────────────────────────────────────────

/*
 * Segment boundaries are marked in the text with private-use characters so the
 * paragraph and list parser can run over the whole answer at once, while still
 * knowing where each claim ends and its citations belong. The model can't
 * produce these characters meaningfully, and any it does are stripped first.
 */
const MARK = String.fromCharCode(0xe000);
const END = String.fromCharCode(0xe001);
const MARKER_SPLIT = new RegExp(`${MARK}(\\d+)${END}`);
const STRAY_MARKERS = new RegExp(`[${MARK}${END}]`, "g");
const MARKERS_ONLY = new RegExp(`^(?:\\s|${MARK}\\d+${END})*$`);

type Block = { type: "p"; lines: string[] } | { type: "ul"; items: string[] };

type Numbered = Map<string, { number: number; source: AssistantSource }>;

function AnswerBody({
  segments,
  sources,
  knownLinks,
  onNavigate,
}: {
  segments: Segment[];
  sources: Numbered;
  knownLinks: ReadonlySet<string>;
  onNavigate: (destination: Destination) => void;
}) {
  const marked = segments
    .map((segment, index) => {
      const text = segment.text.replace(STRAY_MARKERS, "");
      return segment.check ? `${text}${MARK}${index}${END}` : text;
    })
    .join("");

  // Walks segments in reading order as the blocks render.
  const cursor = { segment: 0 };

  const inline = (text: string): ReactNode[] => {
    const parts = text.split(MARKER_SPLIT);
    const nodes: ReactNode[] = [];

    parts.forEach((part, index) => {
      if (index % 2 === 1) {
        const segmentIndex = Number(part);
        nodes.push(
          <SegmentMarks
            key={`m${index}`}
            segment={segments[segmentIndex]}
            sources={sources}
            onNavigate={onNavigate}
          />,
        );
        cursor.segment = segmentIndex + 1;
        return;
      }

      // Pull the pill up against the word it cites.
      const run = index < parts.length - 1 ? part.replace(/\s+$/, "") : part;
      if (!run) return;

      const status = segments[cursor.segment]?.check?.status;
      nodes.push(
        <span
          key={`t${index}`}
          className={cn(
            status === "unsupported" &&
              "underline decoration-amber-500 decoration-dotted decoration-[1.5px] underline-offset-[3px]",
            status === "uncited" &&
              "underline decoration-muted-foreground/50 decoration-dotted underline-offset-[3px]",
          )}
        >
          {linkify(run, knownLinks)}
        </span>,
      );
    });

    return nodes;
  };

  return (
    <>
      {toBlocks(marked).map((block, index) =>
        block.type === "ul" ? (
          <ul key={index} className="my-1.5 space-y-1.5 first:mt-0 last:mb-0">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5">
                <span aria-hidden className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span className="min-w-0">{inline(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={index} className="mt-2 first:mt-0">
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </>
  );
}

/** Paragraphs and `- ` / `1. ` lists — all the formatting the prompt allows. */
function toBlocks(marked: string): Block[] {
  const blocks: Block[] = [];

  for (const paragraph of marked.split(/\n{2,}/)) {
    let current: Block | null = null;

    for (const line of paragraph.split("\n")) {
      // A citation that landed on its own line belongs to the line above.
      if (MARKERS_ONLY.test(line)) {
        if (!line.trim()) continue;
        const target: Block | null = current ?? blocks.at(-1) ?? null;
        if (target?.type === "ul" && target.items.length > 0) target.items[target.items.length - 1] += line.trim();
        else if (target?.type === "p" && target.lines.length > 0) target.lines[target.lines.length - 1] += line.trim();
        else blocks.push({ type: "p", lines: [line.trim()] });
        continue;
      }

      const item = /^\s*(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
      if (item) {
        if (current?.type !== "ul") {
          if (current) blocks.push(current);
          current = { type: "ul", items: [] };
        }
        current.items.push(item[1]);
      } else {
        if (current?.type !== "p") {
          if (current) blocks.push(current);
          current = { type: "p", lines: [] };
        }
        current.lines.push(line);
      }
    }

    if (current) blocks.push(current);
  }

  return blocks;
}

// ── Citations & flags ────────────────────────────────────────────────────────

/** Numbers each source by first appearance, so [1] is always the first cited. */
function numberSources(segments: Segment[]): Numbered {
  const numbered: Numbered = new Map();
  for (const segment of segments) {
    for (const { source } of segment.citations) {
      if (!numbered.has(source.id)) {
        numbered.set(source.id, { number: numbered.size + 1, source });
      }
    }
  }
  return numbered;
}

function SegmentMarks({
  segment,
  sources,
  onNavigate,
}: {
  segment: Segment | undefined;
  sources: Numbered;
  onNavigate: (destination: Destination) => void;
}) {
  if (!segment) return null;

  // Group this claim's citations by source: one pill per source, every quote inside.
  const bySource = new Map<string, AssistantCitation[]>();
  for (const citation of segment.citations) {
    bySource.set(citation.source.id, [...(bySource.get(citation.source.id) ?? []), citation]);
  }

  const status = segment.check?.status;

  return (
    <span className="whitespace-nowrap">
      {[...bySource.entries()].map(([sourceId, citations]) => {
        const entry = sources.get(sourceId);
        if (!entry) return null;
        const Icon = SOURCE_ICONS[entry.source.kind];

        return (
          <Popover key={sourceId}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Source ${entry.number}: ${entry.source.label}`}
                className="mx-[2px] inline-grid h-[1.15rem] min-w-[1.15rem] -translate-y-px place-items-center rounded-md bg-primary/10 px-1 align-middle font-mono text-[10px] font-semibold leading-none text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20"
              >
                {entry.number}
              </button>
            </PopoverTrigger>
            <PopoverContent
              data-custom-cursor="true"
              side="top"
              align="start"
              className="w-72 overflow-hidden rounded-xl p-0 text-xs"
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-foreground">{entry.source.label}</span>
              </div>
              <div className="space-y-2 px-3 py-2.5">
                {citations.map((citation) => (
                  <blockquote
                    key={citation.factId}
                    className="border-l-2 border-primary/40 pl-2.5 leading-relaxed text-muted-foreground"
                  >
                    {citation.quote}
                  </blockquote>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigate(entry.source)}
                className="flex w-full items-center justify-between border-t border-border px-3 py-2 font-medium text-primary transition-colors hover:bg-muted/50"
              >
                View on the page
                <ArrowRight aria-hidden className="h-3 w-3" />
              </button>
            </PopoverContent>
          </Popover>
        );
      })}

      {status === "unsupported" ? (
        <FlagPill tone="warning" label="Unverified">
          <p className="font-medium text-foreground">Couldn’t verify this against the portfolio</p>
          <ul className="mt-1.5 space-y-1 text-muted-foreground">
            {segment.check?.issues.map((issue) => (
              <li key={`${issue.kind}:${issue.value}`}>{describeIssue(issue)}</li>
            ))}
          </ul>
        </FlagPill>
      ) : status === "uncited" ? (
        <FlagPill tone="muted" label="No source">
          <p className="text-muted-foreground">
            This part of the answer doesn’t point to anything on the page, so treat it with care.
          </p>
        </FlagPill>
      ) : null}
    </span>
  );
}

function describeIssue(issue: SegmentIssue): string {
  switch (issue.kind) {
    case "number":
      return `“${issue.value}” doesn’t appear in the cited source.`;
    case "name":
      return `“${issue.value}” isn’t mentioned anywhere in the portfolio.`;
    case "link":
      return "That link isn’t one the portfolio publishes.";
  }
}

function FlagPill({
  tone,
  label,
  children,
}: {
  tone: "warning" | "muted";
  label: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "mx-[2px] inline-flex h-[1.15rem] -translate-y-px items-center rounded-md px-1.5 align-middle text-[10px] font-medium leading-none ring-1 ring-inset transition-colors",
            tone === "warning"
              ? "bg-amber-500/10 text-amber-700 ring-amber-500/30 hover:bg-amber-500/20 dark:text-amber-400"
              : "bg-muted text-muted-foreground ring-border hover:text-foreground",
          )}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-custom-cursor="true"
        side="top"
        align="start"
        className="w-64 rounded-xl p-3 text-xs"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

// ── Verdict ──────────────────────────────────────────────────────────────────

function Verdict({ summary }: { summary: NonNullable<AssistantMessage["summary"]> }) {
  const { status, factsCited, invalidCitations } = summary;

  const view = {
    grounded: {
      Icon: ShieldCheck,
      tone: "text-emerald-600 dark:text-emerald-400",
      text: `Checked against ${factsCited} portfolio ${factsCited === 1 ? "fact" : "facts"}`,
    },
    partial: {
      Icon: ShieldAlert,
      tone: "text-amber-600 dark:text-amber-400",
      text:
        invalidCitations > 0 && summary.flaggedSegments === 0
          ? "A reference couldn’t be matched to the portfolio"
          : "Some details couldn’t be verified — they’re marked above",
    },
    unanswered: {
      Icon: Info,
      tone: "text-muted-foreground",
      text: "Not covered by the portfolio",
    },
    unverified: {
      Icon: ShieldQuestion,
      tone: "text-muted-foreground",
      text: "No portfolio source for this reply",
    },
  }[status];

  return (
    <p className={cn("flex items-center gap-1.5 pl-1 text-[11px]", view.tone)}>
      <view.Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {view.text}
    </p>
  );
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl rounded-bl-md border border-border bg-background/70 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground text-pretty">
      {children}
    </div>
  );
}

function Checking() {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-border bg-background/70 px-3.5 py-2.5 text-xs text-muted-foreground">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
            style={{ animationDelay: `${dot * 140}ms` }}
          />
        ))}
      </span>
      Checking the portfolio…
    </div>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] animate-pulse rounded-full bg-primary"
    />
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="pl-1 text-[11px] text-muted-foreground">{children}</p>;
}

function ActionChip({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-medium text-foreground transition-colors hover:border-primary/40"
    >
      {icon}
      {children}
    </button>
  );
}

// ── Links ────────────────────────────────────────────────────────────────────

const LINK_PATTERN = /(https?:\/\/[^\s<>"')\]]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;

export function normaliseLink(url: string): string {
  return url.trim().replace(/[.,;:!?]+$/, "").replace(/\/+$/, "").toLowerCase();
}

/**
 * Only links the portfolio itself publishes become clickable. A model that
 * invents or garbles a URL produces plain text, never a working link to
 * somewhere unexpected.
 */
function linkify(text: string, knownLinks: ReadonlySet<string>): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(LINK_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const value = raw.replace(/[.,;:!?]+$/, "");
    const isEmail = !value.startsWith("http");
    const href = isEmail ? `mailto:${value}` : value;

    if (start > last) nodes.push(text.slice(last, start));

    if (knownLinks.has(normaliseLink(href))) {
      nodes.push(
        <a
          key={start}
          href={href}
          target={isEmail ? undefined : "_blank"}
          rel={isEmail ? undefined : "noopener noreferrer"}
          className="break-all font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
        >
          {value}
        </a>,
      );
    } else {
      nodes.push(value);
    }

    nodes.push(raw.slice(value.length));
    last = start + raw.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
