"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  ArrowUpRight,
  CircleHelp,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_QUESTION_LENGTH, type AssistantSource } from "@/lib/assistant/protocol";
import { AssistantAnswer, normaliseLink } from "./assistant-answer";
import { useAssistantChat, type UserMessage } from "./use-assistant-chat";
import { useTurnstile } from "./use-turnstile";

type AssistantWidgetProps = {
  firstName: string;
  avatarUrl: string | null;
  /** Shown under the name when the owner displays availability on the site. */
  availability: string | null;
  welcome: string;
  questions: string[];
  /** URLs the portfolio publishes — the only ones answers may link to. */
  links: string[];
  factCount: number;
  /** Questions per conversation; mirrors the server's limit. */
  turnLimit: number;
  /** Cloudflare Turnstile site key, when the bot check is enabled. */
  turnstileSiteKey: string | null;
};

/** Below this width the panel takes the whole screen. */
const COMPACT_QUERY = "(max-width: 639px)";

/**
 * The "Ask about me" chat: a corner launcher that opens into a panel.
 *
 * Non-modal on desktop — the visitor can keep reading the page, and clicking a
 * source scrolls the page behind the panel. On phones it becomes a full-screen
 * sheet, because a floating box on a small screen covers what it points at.
 */
export function AssistantWidget({
  firstName,
  avatarUrl,
  availability,
  welcome,
  questions,
  links,
  factCount,
  turnLimit,
  turnstileSiteKey,
}: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [compact, setCompact] = useState(false);
  const [discovered, setDiscovered] = useState(true);
  // Set on first open: the bot check (a third-party script) waits until then.
  const [engaged, setEngaged] = useState(false);

  const turnstile = useTurnstile(turnstileSiteKey, engaged);
  const { messages, busy, ask, stop, retry, reset } = useAssistantChat({
    getVerification: turnstile.enabled ? turnstile.takeToken : undefined,
  });
  const reduceMotion = useReducedMotion();

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  const knownLinks = useMemo(() => new Set(links.map(normaliseLink)), [links]);

  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // The launcher pulses until the visitor has opened the chat once this session.
  useEffect(() => {
    try {
      setDiscovered(sessionStorage.getItem("portfolio-assistant:seen") === "1");
    } catch {
      setDiscovered(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setEngaged(true);
    setDiscovered(true);
    try {
      sessionStorage.setItem("portfolio-assistant:seen", "1");
    } catch {
      // Not persisting the hint is harmless.
    }
  }, [open]);

  // Phones: the sheet owns the screen, so the page behind mustn't scroll.
  useEffect(() => {
    if (!open || !compact) return;
    const { overflow } = document.documentElement.style;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = overflow;
    };
  }, [open, compact]);

  // Focus the composer on open (not on phones, where the keyboard would cover
  // the suggestions), and hand focus back to the launcher on close.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !compact) inputRef.current?.focus();
    if (!open && wasOpen.current) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open, compact]);

  // Follow the answer as it streams, unless the reader has scrolled up.
  useEffect(() => {
    const element = scrollRef.current;
    if (element && pinnedToBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, open]);

  const onScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    pinnedToBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  };

  const asked = new Set(
    messages
      .filter((message): message is UserMessage => message.role === "user")
      .map((message) => message.text),
  );
  // Counted locally so a full chat stops *before* sending a request the server
  // would refuse.
  const questionsLeft = turnLimit - messages.filter((message) => message.role === "user").length;

  const submit = (question: string) => {
    if (busy || !question.trim() || questionsLeft <= 0) return;
    pinnedToBottom.current = true;
    void ask(question.slice(0, MAX_QUESTION_LENGTH));
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "";
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(draft);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter breaks the line; never mid IME composition.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit(draft);
    }
  };

  const navigate = (destination: Pick<AssistantSource, "href" | "fallbackHref">) => {
    const target =
      document.getElementById(destination.href.slice(1)) ??
      document.getElementById(destination.fallbackHref.slice(1));
    if (!target) return;

    if (compact) setOpen(false);
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    if (!reduceMotion) {
      target.animate(
        [
          { boxShadow: "0 0 0 2px hsl(var(--primary) / 0.55)" },
          { boxShadow: "0 0 0 2px hsl(var(--primary) / 0)" },
        ],
        { duration: 1800, delay: 350, easing: "ease-out" },
      );
    }
  };

  const last = messages.at(-1);
  const followUps =
    !busy && questionsLeft > 0 && last?.role === "assistant" && last.status === "done"
      ? questions.filter((question) => !asked.has(question)).slice(0, 3)
      : [];

  const nearLimit = draft.length > MAX_QUESTION_LENGTH * 0.8;

  return (
    <>
      {/*
        The bot check lives outside the panel so closing the chat doesn't
        destroy it. It's invisible unless Cloudflare needs a click, and then
        appears just above where the composer sits.
      */}
      {turnstile.enabled ? (
        <div
          ref={turnstile.containerRef}
          aria-hidden={!turnstile.interactive}
          className={
            turnstile.interactive && open
              ? "fixed bottom-28 right-4 z-[60] w-[300px] rounded-xl border border-border bg-card p-2 shadow-xl sm:right-10"
              : "pointer-events-none fixed bottom-0 right-0 h-0 w-0 overflow-hidden opacity-0"
          }
        />
      ) : null}

      <AnimatePresence>
        {!open ? (
          <motion.button
            key="launcher"
            ref={launcherRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Ask about ${firstName} — AI assistant`}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="group fixed bottom-4 right-4 z-40 flex items-center gap-2.5 rounded-full border border-primary/25 bg-card/90 p-1.5 shadow-[0_18px_40px_-16px_hsl(var(--primary)/0.55)] backdrop-blur-md transition-colors hover:border-primary/50 sm:bottom-6 sm:right-6 sm:pr-4"
          >
            <span className="relative grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-accent-2 text-primary-foreground">
              {!discovered ? (
                <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              ) : null}
              <Sparkles aria-hidden className="relative h-[18px] w-[18px]" />
            </span>
            <span className="hidden flex-col items-start leading-tight sm:flex">
              <span className="text-sm font-semibold text-foreground">Ask about {firstName}</span>
              <span className="label-mono text-[0.58rem] text-muted-foreground">
                AI · cites its sources
              </span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            role="dialog"
            aria-modal={compact}
            aria-labelledby="assistant-title"
            onKeyDown={(event) => {
              // Popovers render in a portal, but React still bubbles their key
              // events here. Their Escape belongs to them — only a key pressed
              // inside the panel itself closes the panel.
              if (event.key !== "Escape") return;
              if (!event.currentTarget.contains(event.target as Node)) return;
              setOpen(false);
            }}
            initial={{ opacity: 0, y: compact ? 24 : 16, scale: compact ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: compact ? 24 : 12, scale: compact ? 1 : 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(660px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-border sm:bg-card sm:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)]"
          >
            {/* Accent hairline, echoing the site's indigo→violet gradient. */}
            <div
              aria-hidden
              className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-primary/70 to-transparent"
            />

            {/* ── Header ── */}
            <header className="flex shrink-0 items-center gap-3 bg-gradient-to-b from-primary/[0.07] to-transparent px-4 pb-3 pt-3.5">
              <Avatar firstName={firstName} avatarUrl={avatarUrl} online={Boolean(availability)} />

              <div className="min-w-0 flex-1">
                <h2 id="assistant-title" className="truncate text-sm font-semibold text-foreground">
                  Ask about {firstName}
                </h2>
                <p className="truncate text-xs text-muted-foreground">
                  {availability ?? "AI assistant for this portfolio"}
                </p>
              </div>

              {messages.length > 0 ? (
                <IconButton label="Start a new chat" onClick={reset}>
                  <RotateCcw className="h-4 w-4" />
                </IconButton>
              ) : null}
              <IconButton label="Close the assistant" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </IconButton>
            </header>

            {/* ── Trust strip ── */}
            <div className="flex shrink-0 items-center gap-2 border-y border-border bg-muted/30 px-4 py-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="min-w-0 flex-1 truncate">Answers cite this page · unverifiable details are flagged</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-1 font-medium text-foreground/80 hover:text-foreground"
                  >
                    <CircleHelp aria-hidden className="h-3.5 w-3.5" />
                    How
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  data-custom-cursor="true"
                  align="end"
                  className="w-72 rounded-xl p-4 text-xs leading-relaxed"
                >
                  <p className="font-semibold text-foreground">How answers are checked</p>
                  <ul className="mt-2 space-y-2 text-muted-foreground">
                    <li>
                      The assistant only knows the {factCount} facts published on this page — nothing
                      from the wider internet.
                    </li>
                    <li>Every claim carries a numbered source you can open and read.</li>
                    <li>
                      Numbers, names and links are compared with the portfolio automatically. Anything
                      that doesn’t match is marked <span className="font-medium text-amber-600 dark:text-amber-400">Unverified</span>.
                    </li>
                    <li>If the portfolio doesn’t cover a question, it says so rather than guessing.</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>

            {/* ── Conversation ── */}
            <div
              ref={scrollRef}
              onScroll={onScroll}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
            >
              {messages.length === 0 ? (
                <div className="space-y-5">
                  <div className="rounded-2xl rounded-bl-md border border-border bg-background/70 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground text-pretty">
                    {welcome}
                  </div>

                  {questions.length > 0 ? (
                    <div>
                      <p className="label-mono text-[0.6rem] text-muted-foreground">Recruiters often ask</p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {questions.map((question) => (
                          <SuggestionChip key={question} onClick={() => submit(question)}>
                            {question}
                          </SuggestionChip>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-[13.5px] leading-relaxed text-primary-foreground">
                        {message.text}
                      </p>
                    </div>
                  ) : (
                    <div key={message.id} className="max-w-[94%]">
                      <AssistantAnswer
                        message={message}
                        firstName={firstName}
                        knownLinks={knownLinks}
                        onNavigate={navigate}
                        onRetry={() => retry(message.id)}
                        onReset={reset}
                      />
                    </div>
                  ),
                )
              )}

              {followUps.length > 0 ? (
                <div className="pt-1">
                  <p className="label-mono text-[0.6rem] text-muted-foreground">You could also ask</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {followUps.map((question) => (
                      <SuggestionChip key={question} onClick={() => submit(question)}>
                        {question}
                      </SuggestionChip>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Screen readers get one announcement per answer, not every token. */}
            <p className="sr-only" aria-live="polite">
              {busy ? "Answering…" : last?.role === "assistant" && last.status === "done" ? "Answer ready." : ""}
            </p>

            {/* ── Composer ── */}
            <form
              onSubmit={onSubmit}
              className="shrink-0 border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
            >
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background py-1.5 pl-3 pr-1.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
                <label htmlFor="assistant-question" className="sr-only">
                  Your question
                </label>
                <textarea
                  id="assistant-question"
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={MAX_QUESTION_LENGTH}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    // Grow with the text, up to about five lines.
                    event.target.style.height = "auto";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={onComposerKeyDown}
                  disabled={questionsLeft <= 0}
                  placeholder={
                    questionsLeft <= 0
                      ? "Start a new chat to ask more"
                      : `Ask about ${firstName}’s experience, projects…`
                  }
                  className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-2 text-[13.5px] leading-snug text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {busy ? (
                  <button
                    type="button"
                    onClick={stop}
                    aria-label="Stop the answer"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground transition-colors hover:bg-muted/70"
                  >
                    <Square aria-hidden className="h-3.5 w-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    aria-label="Send question"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-35"
                  >
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 flex items-center justify-between gap-3 px-1 text-[10.5px] text-muted-foreground">
                {questionsLeft <= 0 ? (
                  <button
                    type="button"
                    onClick={reset}
                    className="truncate font-medium text-primary hover:underline"
                  >
                    This chat is full — start a new one to keep asking
                  </button>
                ) : questionsLeft <= 2 ? (
                  <span className="truncate">
                    {questionsLeft} {questionsLeft === 1 ? "question" : "questions"} left in this chat
                  </span>
                ) : (
                  <span className="truncate">Answers come only from this portfolio.</span>
                )}
                {nearLimit ? (
                  <span className="shrink-0 font-mono">
                    {draft.length}/{MAX_QUESTION_LENGTH}
                  </span>
                ) : null}
              </p>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Avatar({
  firstName,
  avatarUrl,
  online,
}: {
  firstName: string;
  avatarUrl: string | null;
  online: boolean;
}) {
  return (
    <span className="relative shrink-0">
      <span className="block rounded-full bg-gradient-to-br from-primary to-accent-2 p-[1.5px]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a 40px avatar from an arbitrary CMS host; next/image would need every host allow-listed.
          <img
            src={avatarUrl}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-full bg-card object-cover"
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-card text-sm font-semibold text-foreground">
            {firstName.charAt(0)}
          </span>
        )}
      </span>
      {online ? (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500"
        />
      ) : null}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function SuggestionChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-foreground/85 transition-colors hover:border-primary/40 hover:bg-elevated hover:text-foreground"
    >
      {children}
      <ArrowUpRight
        aria-hidden
        className="h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-primary"
      />
    </button>
  );
}
